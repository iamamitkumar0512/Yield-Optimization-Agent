/**
 * Direct test of Enso SDK to isolate the issue
 */

import { EnsoClient, BundleAction, BundleParams, BundleActionType } from "@ensofinance/sdk";
import * as dotenv from "dotenv";

dotenv.config();

async function testEnsoDirect() {
  console.log("🧪 Testing Enso SDK Directly\n");

  const apiKey = process.env.ENSO_API_KEY;
  if (!apiKey) {
    console.error("❌ ENSO_API_KEY not found in environment");
    process.exit(1);
  }

  console.log(`✅ API Key loaded: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

  const client = new EnsoClient({ apiKey });

  // Test 1: Get token data to find protocols
  console.log("📊 Step 1: Getting token data for USDC on Ethereum...\n");
  
  try {
    const tokenData = await client.getTokenData({
      underlyingTokensExact: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
      chainId: 1,
      includeMetadata: true,
      type: "defi",
    });

    console.log(`Found ${tokenData.data.length} protocols\n`);

    // Show first few protocols to understand the structure
    console.log("First 5 protocols:");
    tokenData.data.slice(0, 5).forEach((token, i) => {
      console.log(`\n${i + 1}. ${token.name}`);
      console.log(`   Address: ${token.address}`);
      console.log(`   Protocol: ${token.protocol}`);
      console.log(`   Project: ${token.project}`);
      console.log(`   APY: ${token.apy}%`);
    });

    // Find Aave protocol
    const aaveProtocol = tokenData.data.find(
      (token) => token.name.toLowerCase().includes("aave v3") && token.apy && parseFloat(token.apy.toString()) > 0
    );

    if (!aaveProtocol) {
      console.error("❌ Aave v3 protocol not found");
      process.exit(1);
    }

    console.log("\n✅ Selected Aave v3 Protocol:");
    console.log(`   Name: ${aaveProtocol.name}`);
    console.log(`   Address: ${aaveProtocol.address}`);
    console.log(`   Protocol: ${aaveProtocol.protocol}`);
    console.log(`   Project: ${aaveProtocol.project}`);
    console.log(`   APY: ${aaveProtocol.apy}%`);
    console.log(`   TVL: $${aaveProtocol.tvl?.toLocaleString()}\n`);

    // Test 2: Get approval data
    console.log("📝 Step 2: Getting approval data...\n");

    const userAddress = "0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9";
    const tokenAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const amount = "100000000"; // 100 USDC (6 decimals)

    const approvalData = await client.getApprovalData({
      fromAddress: userAddress as `0x${string}`,
      tokenAddress: tokenAddress as `0x${string}`,
      chainId: 1,
      amount: amount,
    });

    console.log("✅ Approval Data:");
    console.log(`   Spender: ${approvalData.spender || approvalData.tx.to}`);
    console.log(`   To: ${approvalData.tx.to}`);
    console.log(`   Data: ${approvalData.tx.data.substring(0, 66)}...`);
    console.log(`   Gas: ${approvalData.gas}\n`);

    // Test 3: Get bundle data
    console.log("🔄 Step 3: Getting bundle data...\n");

    const bundleParams: BundleParams = {
      chainId: 1,
      fromAddress: userAddress as `0x${string}`,
      routingStrategy: "router",
      receiver: userAddress as `0x${string}`,
    };

    // Try different combinations to find what works
    console.log("Trying option 1: tokenOut = vault address, primaryAddress = vault address");
    let bundleActions: BundleAction[] = [
      {
        protocol: aaveProtocol.protocol,
        action: BundleActionType.Deposit,
        args: {
          tokenIn: tokenAddress as `0x${string}`,
          tokenOut: aaveProtocol.address as `0x${string}`,
          amountIn: amount,
          primaryAddress: aaveProtocol.address as `0x${string}`,
        },
      },
    ];

    try {
      const bundleData1 = await client.getBundleData(bundleParams, bundleActions);
      console.log("✅ Option 1 worked!");
      console.log(JSON.stringify(bundleData1, null, 2));
      return;
    } catch (err1) {
      console.log("❌ Option 1 failed:", (err1 as Error).message);
    }

    // Try option 2: tokenOut = tokenIn (for Aave, you get back the same token as aToken)
    console.log("\nTrying option 2: tokenOut = tokenIn");
    bundleActions = [
      {
        protocol: aaveProtocol.protocol,
        action: BundleActionType.Deposit,
        args: {
          tokenIn: tokenAddress as `0x${string}`,
          tokenOut: tokenAddress as `0x${string}`, // Same as tokenIn
          amountIn: amount,
          primaryAddress: aaveProtocol.address as `0x${string}`,
        },
      },
    ];

    try {
      const bundleData2 = await client.getBundleData(bundleParams, bundleActions);
      console.log("✅ Option 2 worked!");
      console.log(JSON.stringify(bundleData2, null, 2));
      return;
    } catch (err2) {
      console.log("❌ Option 2 failed:", (err2 as Error).message);
    }

    // Try option 3: No primaryAddress
    console.log("\nTrying option 3: Without primaryAddress");
    bundleActions = [
      {
        protocol: aaveProtocol.protocol,
        action: BundleActionType.Deposit,
        args: {
          tokenIn: tokenAddress as `0x${string}`,
          tokenOut: aaveProtocol.address as `0x${string}`,
          amountIn: amount,
        } as any,
      },
    ];

    try {
      const bundleData3 = await client.getBundleData(bundleParams, bundleActions);
      console.log("✅ Option 3 worked!");
      console.log(JSON.stringify(bundleData3, null, 2));
      return;
    } catch (err3) {
      console.log("❌ Option 3 failed:", (err3 as Error).message);
    }

    throw new Error("All options failed");

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

testEnsoDirect().catch(console.error);

