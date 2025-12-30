/**
 * LangChain tools for the yield agent
 * Wraps service functions as tools that the agent can use
 */

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getTokenInfo, searchToken } from './api';
import {
  discoverProtocols,
  discoverProtocolsMultiChain,
  generateTransactionBundle,
} from './enso-service';
import { addSafetyScores, sortProtocolsBySafetyAndYield } from './safety-service';
import { validateTokenInput, validateChain, validateAmount } from './validation';
import { Logger } from '../common/logger';
import { ProtocolVault } from './types';

const logger = new Logger('AgentTools');

/**
 * Tool: Get token information
 */
export const getTokenInfoTool = tool(
  async (input): Promise<string> => {
    const { token, chainId, chainName } = input;
    try {
      logger.info(`Getting token info for: ${token}`);

      // Validate input
      const validation = validateTokenInput({ token, chainId, chainName });
      if (!validation.valid) {
        return JSON.stringify({
          error: validation.error || validation.errors?.join(', '),
          validationErrors: validation.errors,
        });
      }

      const tokenInfo = await getTokenInfo(token, chainId, chainName);

      if (!tokenInfo) {
        return JSON.stringify({
          error: 'Token not found. Please check spelling or provide contract address with chain.',
        });
      }

      // If multiple tokens found, return array
      if (Array.isArray(tokenInfo)) {
        return JSON.stringify({
          multipleMatches: true,
          tokens: tokenInfo,
          message: `Multiple tokens found. Please select one: ${tokenInfo.map((t) => `${t.name} (${t.symbol})`).join(', ')}`,
        });
      }

      return JSON.stringify({
        success: true,
        token: tokenInfo,
        warning: '⚠️ Please verify token details before proceeding',
      });
    } catch (error) {
      logger.error('Error in getTokenInfoTool:', error);
      return JSON.stringify({
        error: `Failed to get token info: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
  {
    name: 'get_token_info',
    description:
      'Get token information by name, symbol, or address. If address is provided, chainId or chainName MUST be provided.',
    schema: z.object({
      token: z.string().describe('Token name, symbol, or contract address'),
      chainId: z.number().optional().describe('Chain ID (required if token is an address)'),
      chainName: z.string().optional().describe('Chain name (required if token is an address)'),
    }),
  },
);

/**
 * Tool: Search for tokens
 */
export const searchTokenTool = tool(
  async (input): Promise<string> => {
    const { query } = input;
    try {
      logger.info(`Searching for token: ${query}`);
      const results = await searchToken(query);

      if (results.length === 0) {
        return JSON.stringify({
          error: 'No tokens found. Please try a different search term.',
        });
      }

      return JSON.stringify({
        success: true,
        count: results.length,
        tokens: results,
      });
    } catch (error) {
      logger.error('Error in searchTokenTool:', error);
      return JSON.stringify({
        error: `Failed to search tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
  {
    name: 'search_token',
    description: 'Search for tokens by name or symbol (fuzzy search)',
    schema: z.object({
      query: z.string().describe('Search query (token name or symbol)'),
    }),
  },
);

/**
 * Tool: Discover protocols for a token
 */
export const discoverProtocolsTool = tool(
  async (input): Promise<string> => {
    const { tokenAddress, chainId, multiChain } = input;
    try {
      logger.info(`Discovering protocols for token ${tokenAddress}`);

      let protocols: ProtocolVault[];

      if (multiChain) {
        protocols = await discoverProtocolsMultiChain(tokenAddress);
      } else {
        if (!chainId) {
          return JSON.stringify({
            error: 'chainId is required when multiChain is false',
          });
        }

        const chainValidation = validateChain(chainId);
        if (!chainValidation.valid) {
          return JSON.stringify({
            error: chainValidation.error || 'Invalid chain',
          });
        }

        protocols = await discoverProtocols(tokenAddress, chainId);
      }

      if (protocols.length === 0) {
        return JSON.stringify({
          error: 'No staking protocols found for this token on supported chains.',
          suggestion: 'Try searching on different chains or check if token supports staking.',
        });
      }

      // Add safety scores
      const protocolsWithSafety = await addSafetyScores(protocols);

      // Sort by safety and yield
      const sortedProtocols = sortProtocolsBySafetyAndYield(protocolsWithSafety);

      return JSON.stringify({
        success: true,
        count: sortedProtocols.length,
        protocols: sortedProtocols.map((p) => ({
          address: p.address,
          name: p.name,
          protocol: p.protocol,
          chainId: p.chainId,
          chainName: p.chainName,
          apy: p.apy,
          tvl: p.tvl,
          safetyScore: p.safetyScore,
        })),
      });
    } catch (error) {
      logger.error('Error in discoverProtocolsTool:', error);
      return JSON.stringify({
        error: `Failed to discover protocols: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
  {
    name: 'discover_protocols',
    description:
      'Discover all available staking protocols/vaults for a token. Can search single chain or all supported chains.',
    schema: z.object({
      tokenAddress: z.string().describe('Token contract address'),
      chainId: z.number().optional().describe('Chain ID (required if multiChain is false)'),
      multiChain: z
        .boolean()
        .default(true)
        .describe('Whether to search across all supported chains'),
    }),
  },
);

/**
 * Tool: Generate transaction bundle
 */
export const generateTransactionTool = tool(
  async (input): Promise<string> => {
    const {
      userAddress,
      tokenAddress,
      protocolAddress,
      protocolName,
      chainId,
      amount,
      tokenSymbol,
      decimals,
    } = input;
    try {
      logger.info(`Generating transaction bundle for ${tokenSymbol} deposit`);

      // Validate inputs
      const amountValidation = validateAmount(
        amount,
        BigInt('999999999999999999999999999'), // Max balance placeholder - should be checked separately
        decimals,
      );

      if (!amountValidation.valid) {
        return JSON.stringify({
          error: amountValidation.error || 'Invalid amount',
        });
      }

      const bundle = await generateTransactionBundle(
        userAddress,
        tokenAddress,
        protocolAddress,
        protocolName,
        chainId,
        BigInt(amount),
        tokenSymbol,
        decimals,
      );

      return JSON.stringify({
        success: true,
        bundle: {
          approvalTransaction: bundle.approvalTransaction,
          depositTransaction: bundle.depositTransaction,
          executionOrder: bundle.executionOrder,
          totalGasEstimate: bundle.totalGasEstimate,
        },
        warning:
          '⚠️ CRITICAL: This transaction object was generated by an AI agent. Please verify all details before executing. This is not financial advice.',
      });
    } catch (error) {
      logger.error('Error in generateTransactionTool:', error);
      return JSON.stringify({
        error: `Failed to generate transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
  {
    name: 'generate_transaction',
    description:
      'Generate transaction bundle (approval + deposit) for staking tokens. Returns approval transaction if needed, and deposit transaction.',
    schema: z.object({
      userAddress: z.string().describe('User wallet address'),
      tokenAddress: z.string().describe('Token contract address'),
      protocolAddress: z.string().describe('Protocol/vault contract address'),
      protocolName: z.string().describe('Protocol name (e.g., "aave-v3")'),
      chainId: z.number().describe('Chain ID'),
      amount: z.string().describe('Amount to deposit (in wei)'),
      tokenSymbol: z.string().describe('Token symbol'),
      decimals: z.number().describe('Token decimals'),
    }),
  },
);

/**
 * Tool: Validate input
 */
export const validateInputTool = tool(
  async (input): Promise<string> => {
    const { input: userInput, inputType } = input;
    try {
      if (inputType === 'token') {
        const validation = validateTokenInput(userInput);
        return JSON.stringify({
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      if (inputType === 'chain') {
        const validation = validateChain(userInput);
        return JSON.stringify({
          valid: validation.valid,
          error: validation.error,
          supportedChains: validation.supportedChains,
        });
      }

      return JSON.stringify({
        error: 'Unknown input type',
      });
    } catch (error) {
      logger.error('Error in validateInputTool:', error);
      return JSON.stringify({
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
  {
    name: 'validate_input',
    description: 'Validate user input (token, chain, etc.)',
    schema: z.object({
      input: z.union([z.string(), z.number(), z.object({})]).describe('Input to validate'),
      inputType: z.enum(['token', 'chain', 'amount']).describe('Type of input to validate'),
    }),
  },
);

/**
 * Get all tools for the agent
 */
export function getYieldAgentTools() {
  return [
    getTokenInfoTool,
    searchTokenTool,
    discoverProtocolsTool,
    generateTransactionTool,
    validateInputTool,
  ];
}

