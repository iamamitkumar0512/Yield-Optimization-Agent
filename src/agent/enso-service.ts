/**
 * Enso SDK service
 * Handles protocol discovery, approval checks, and transaction bundle creation
 */

import { EnsoClient, BundleAction, BundleParams } from "@ensofinance/sdk";
import { isAddress } from "viem";
import { formatUnits } from "viem";
import {
  ProtocolVault,
  ApprovalCheckResult,
  ApprovalTransaction,
  DepositTransaction,
  TransactionBundle,
} from "./types";
import { Logger } from "../common/logger";
import { SUPPORTED_CHAINS, getChainById } from "../common/types";
import { retryWithBackoff } from "../common/utils";

const logger = new Logger("EnsoService");

// Initialize Enso client
let ensoClient: EnsoClient | null = null;

/**
 * Initialize Enso client with API key
 */
export function initializeEnsoClient(apiKey: string): void {
  if (!apiKey) {
    throw new Error("Enso API key is required");
  }
  ensoClient = new EnsoClient({ apiKey });
  logger.info("Enso client initialized");
}

/**
 * Get Enso client instance
 */
function getEnsoClient(): EnsoClient {
  if (!ensoClient) {
    const apiKey = process.env.ENSO_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Enso API key not found. Set ENSO_API_KEY environment variable."
      );
    }
    initializeEnsoClient(apiKey);
  }
  return ensoClient!;
}

/**
 * Discover protocols/vaults for a token on a specific chain
 */
export async function discoverProtocols(
  tokenAddress: string,
  chainId: number
): Promise<ProtocolVault[]> {
  try {
    logger.info(
      `Discovering protocols for token ${tokenAddress} on chain ${chainId}`
    );

    if (!isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const client = getEnsoClient();

    const tokenData = await retryWithBackoff(async () => {
      return await client.getTokenData({
        underlyingTokensExact: [tokenAddress as `0x${string}`],
        chainId: chainId,
        includeMetadata: true,
        type: "defi", // Only DeFi vaults
      });
    });

    const protocols: ProtocolVault[] = [];

    for (const token of tokenData.data || []) {
      // Filter to only include vaults/protocols (not the token itself)
      const apyValue =
        typeof token.apy === "string" ? parseFloat(token.apy) : token.apy || 0;
      if (
        token.address.toLowerCase() !== tokenAddress.toLowerCase() &&
        apyValue > 0
      ) {
        const tvlValue =
          typeof token.tvl === "string"
            ? parseFloat(token.tvl)
            : token.tvl || 0;
        protocols.push({
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          protocol: token.project || "unknown",
          chainId: chainId,
          chainName: chain.name,
          apy: apyValue,
          tvl: tvlValue,
          underlyingTokens:
            token.underlyingTokens?.map((ut) => ({
              address: ut.address,
              symbol: ut.symbol,
              name: ut.name,
            })) || [],
          logosUri: token.logosUri,
          project: token.project,
        });
      }
    }

    logger.info(
      `Found ${protocols.length} protocols for token ${tokenAddress} on chain ${chainId}`
    );
    return protocols;
  } catch (error) {
    logger.error(`Error discovering protocols:`, error);
    throw new Error(
      `Failed to discover protocols: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Discover protocols across all supported chains
 */
export async function discoverProtocolsMultiChain(
  tokenAddress: string
): Promise<ProtocolVault[]> {
  logger.info(
    `Discovering protocols for token ${tokenAddress} across all chains`
  );

  const allProtocols: ProtocolVault[] = [];

  // Query each supported chain in parallel
  const promises = SUPPORTED_CHAINS.map((chain) =>
    discoverProtocols(tokenAddress, chain.id).catch((error) => {
      logger.warn(`Failed to discover protocols on ${chain.name}:`, error);
      return [] as ProtocolVault[];
    })
  );

  const results = await Promise.all(promises);

  // Flatten results
  for (const protocols of results) {
    allProtocols.push(...protocols);
  }

  logger.info(`Found ${allProtocols.length} total protocols across all chains`);
  return allProtocols;
}

/**
 * Check if token approval is needed
 */
export async function checkApprovalNeeded(
  userAddress: string,
  tokenAddress: string,
  protocolAddress: string,
  chainId: number,
  amount: bigint
): Promise<ApprovalCheckResult> {
  try {
    logger.info(
      `Checking approval for token ${tokenAddress}, spender ${protocolAddress}, amount ${amount.toString()}`
    );

    if (
      !isAddress(userAddress) ||
      !isAddress(tokenAddress) ||
      !isAddress(protocolAddress)
    ) {
      return {
        approvalNeeded: false,
        error: "Invalid address format",
        message: "Invalid address format",
      };
    }

    // Note: In a real implementation, you would check the current allowance on-chain
    // For now, we'll assume approval is needed and generate the approval transaction
    // The Enso SDK getApprovalData will handle the actual allowance check

    const client = getEnsoClient();

    try {
      const approvalData = await retryWithBackoff(async () => {
        return await client.getApprovalData({
          fromAddress: userAddress as `0x${string}`,
          tokenAddress: tokenAddress as `0x${string}`,
          chainId: chainId,
          amount: amount.toString(),
        });
      });

      const approvalTransaction: ApprovalTransaction = {
        to: approvalData.tx.to,
        data: approvalData.tx.data,
        value:
          typeof approvalData.tx.value === "string"
            ? approvalData.tx.value
            : approvalData.tx.value.toString(),
        gasLimit:
          typeof approvalData.gas === "string"
            ? approvalData.gas
            : approvalData.gas.toString(),
        gasPrice: undefined, // Not provided by Enso SDK
        chainId: chainId,
        tokenAddress: tokenAddress,
        spender: protocolAddress,
        amount: amount.toString(),
        type: "approve",
        safetyWarning:
          "⚠️ CRITICAL: This transaction object was generated by an AI agent. Please verify all details (token address, protocol address, amount, chain) before executing. Double-check on block explorer and protocol website. This is not financial advice.",
      };

      return {
        approvalNeeded: true,
        requiredAmount: amount,
        approvalTransaction,
        message: "Approval transaction required before deposit",
      };
    } catch (error) {
      // If approval data fetch fails, assume approval might not be needed
      // or there's an error - log and return error
      logger.warn(`Failed to get approval data:`, error);
      return {
        approvalNeeded: false,
        error: `Failed to check approval: ${error instanceof Error ? error.message : "Unknown error"}`,
        message: "Could not verify approval status",
      };
    }
  } catch (error) {
    logger.error(`Error checking approval:`, error);
    return {
      approvalNeeded: false,
      error: `Failed to check approval: ${error instanceof Error ? error.message : "Unknown error"}`,
      message: "Could not verify approval status",
    };
  }
}

/**
 * Generate deposit transaction bundle
 */
export async function generateTransactionBundle(
  userAddress: string,
  tokenAddress: string,
  protocolAddress: string,
  protocolName: string,
  chainId: number,
  amount: bigint,
  tokenSymbol: string,
  decimals: number
): Promise<TransactionBundle> {
  try {
    logger.info(
      `Generating transaction bundle for ${tokenSymbol} deposit to ${protocolName} on chain ${chainId}`
    );

    if (
      !isAddress(userAddress) ||
      !isAddress(tokenAddress) ||
      !isAddress(protocolAddress)
    ) {
      throw new Error("Invalid address format");
    }

    const client = getEnsoClient();

    // Step 1: Check if approval is needed
    const approvalCheck = await checkApprovalNeeded(
      userAddress,
      tokenAddress,
      protocolAddress,
      chainId,
      amount
    );

    // Step 2: Generate deposit transaction
    const bundleActions: BundleAction[] = [
      {
        protocol: protocolName,
        action: "deposit",
        args: {
          tokenIn: tokenAddress as `0x${string}`,
          tokenOut: protocolAddress as `0x${string}`,
          amountIn: amount.toString(),
          primaryAddress: protocolAddress as `0x${string}`,
        },
      },
    ];

    const bundleParams: BundleParams = {
      chainId: chainId,
      fromAddress: userAddress as `0x${string}`,
      routingStrategy: "router",
      receiver: userAddress as `0x${string}`,
    };

    const depositTxData = await retryWithBackoff(async () => {
      return await client.getBundleData(bundleParams, bundleActions);
    });

    const depositTransaction: DepositTransaction = {
      to: depositTxData.tx.to,
      data: depositTxData.tx.data,
      value:
        typeof depositTxData.tx.value === "string"
          ? depositTxData.tx.value
          : depositTxData.tx.value.toString(),
      gasLimit:
        typeof depositTxData.gas === "string"
          ? depositTxData.gas
          : depositTxData.gas.toString(),
      gasPrice: undefined, // Not provided by Enso SDK
      chainId: chainId,
      protocol: protocolName,
      action: "deposit",
      tokenIn: {
        address: tokenAddress,
        symbol: tokenSymbol,
        amount: formatUnits(amount, decimals),
        amountWei: amount.toString(),
      },
      tokenOut: {
        address: protocolAddress,
        symbol: protocolName,
      },
      type: "deposit",
      safetyWarning:
        "⚠️ CRITICAL: This transaction object was generated by an AI agent. Please verify all details (token address, protocol address, amount, chain) before executing. Double-check on block explorer and protocol website. This is not financial advice.",
    };

    // Step 3: Build transaction bundle
    const executionOrder: ("approve" | "deposit")[] = [];

    if (approvalCheck.approvalNeeded && approvalCheck.approvalTransaction) {
      executionOrder.push("approve", "deposit");

      // Calculate total gas estimate
      const approvalGas = approvalCheck.approvalTransaction.gasLimit
        ? BigInt(approvalCheck.approvalTransaction.gasLimit)
        : BigInt(0);
      const depositGas = depositTransaction.gasLimit
        ? BigInt(depositTransaction.gasLimit)
        : BigInt(0);
      const totalGas = approvalGas + depositGas;

      return {
        approvalTransaction: approvalCheck.approvalTransaction,
        depositTransaction,
        executionOrder,
        totalGasEstimate: totalGas.toString(),
      };
    }

    executionOrder.push("deposit");
    return {
      depositTransaction,
      executionOrder,
    };
  } catch (error) {
    logger.error(`Error generating transaction bundle:`, error);
    throw new Error(
      `Failed to generate transaction bundle: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get token price from Enso
 */
export async function getTokenPrice(
  tokenAddress: string,
  chainId: number
): Promise<number | null> {
  try {
    const client = getEnsoClient();
    const priceData = await retryWithBackoff(async () => {
      return await client.getPriceData({
        address: tokenAddress as `0x${string}`,
        chainId: chainId,
      });
    });

    const priceValue = priceData.price
      ? typeof priceData.price === "string"
        ? parseFloat(priceData.price)
        : priceData.price
      : null;
    return priceValue;
  } catch (error) {
    logger.warn(`Failed to get token price:`, error);
    return null;
  }
}
