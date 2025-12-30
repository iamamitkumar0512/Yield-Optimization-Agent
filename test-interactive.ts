/**
 * Interactive Testing Script for Yield Agent
 * Allows manual step-by-step testing of the conversation flow
 *
 * Usage:
 *   yarn test:interactive
 *   or
 *   tsx test-interactive.ts
 */

import { runYieldAgent } from "./src";
import * as readline from "readline";

// Type for agent response to fix TypeScript errors
interface AgentResponseData {
  answer?: string;
  step?: string;
  mode?: string;
  confidence?: string;
  tokenInfo?: {
    name: string;
    symbol: string;
    address?: string;
    chain?: string;
    chainId?: number;
    price?: number;
    marketCap?: number;
  };
  protocols?: Array<{
    name: string;
    protocol: string;
    chainName: string;
    chainId: number;
    apy: number;
    tvl: number;
    safetyScore?: {
      overall?: string;
      score?: number;
    };
  }>;
  approvalTransaction?: {
    to: string;
    data: string;
  };
  depositTransaction?: {
    to: string;
    value?: string;
    data: string;
  };
  validationErrors?: string[];
  [key: string]: unknown;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function displayResponse(
  result: { response?: unknown },
  stepNumber: number
): void {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📤 Step ${stepNumber} Response`);
  console.log(`${"=".repeat(80)}`);

  const response = result.response as AgentResponseData | undefined;

  console.log(`\n📊 Status:`);
  console.log(`   Step: ${response?.step || "N/A"}`);
  console.log(`   Mode: ${response?.mode || "N/A"}`);
  console.log(`   Confidence: ${response?.confidence || "N/A"}`);

  if (response?.tokenInfo) {
    console.log(`\n🪙 Token Information:`);
    console.log(`   Name: ${response.tokenInfo.name}`);
    console.log(`   Symbol: ${response.tokenInfo.symbol}`);
    console.log(`   Address: ${response.tokenInfo.address || "N/A"}`);
    console.log(
      `   Chain: ${response.tokenInfo.chain || "N/A"} (${response.tokenInfo.chainId || "N/A"})`
    );
    if (response.tokenInfo.price) {
      console.log(`   Price: $${response.tokenInfo.price}`);
    }
    if (response.tokenInfo.marketCap) {
      console.log(
        `   Market Cap: $${response.tokenInfo.marketCap.toLocaleString()}`
      );
    }
  }

  if (response?.protocols && response.protocols.length > 0) {
    console.log(`\n🏦 Protocols Found (${response.protocols.length}):`);
    response.protocols.slice(0, 5).forEach((protocol: any, i: number) => {
      console.log(`   ${i + 1}. ${protocol.name} (${protocol.protocol})`);
      console.log(`      Chain: ${protocol.chainName} (${protocol.chainId})`);
      console.log(`      APY: ${protocol.apy}%`);
      console.log(`      TVL: $${protocol.tvl.toLocaleString()}`);
      console.log(
        `      Safety: ${protocol.safetyScore?.overall || "N/A"} (${protocol.safetyScore?.score || "N/A"})`
      );
    });
    if (response.protocols.length > 5) {
      console.log(`   ... and ${response.protocols.length - 5} more`);
    }
  }

  if (response?.approvalTransaction) {
    console.log(`\n✅ Approval Transaction:`);
    console.log(`   To: ${response.approvalTransaction.to}`);
    console.log(
      `   Data: ${response.approvalTransaction.data.substring(0, 50)}...`
    );
  }

  if (response?.depositTransaction) {
    console.log(`\n✅ Deposit Transaction:`);
    console.log(`   To: ${response.depositTransaction.to}`);
    console.log(`   Value: ${response.depositTransaction.value || "0"}`);
    console.log(
      `   Data: ${response.depositTransaction.data.substring(0, 50)}...`
    );
  }

  if (response?.validationErrors && response.validationErrors.length > 0) {
    console.log(`\n⚠️  Validation Errors:`);
    response.validationErrors.forEach((error: string) => {
      console.log(`   - ${error}`);
    });
  }

  console.log(`\n💬 Agent Answer:`);
  console.log(`   ${response?.answer || "No answer provided"}`);
  console.log(`${"=".repeat(80)}\n`);
}

async function runInteractiveTest(): Promise<void> {
  console.log("🚀 Interactive Yield Agent Testing\n");
  console.log("This script allows you to test the agent step-by-step.");
  console.log('Type "exit" or "quit" at any time to stop.\n');

  const conversationHistory: string[] = [];
  let stepNumber = 1;

  while (true) {
    const userInput = await question(
      `\n[Step ${stepNumber}] Enter your message: `
    );

    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit"
    ) {
      console.log("\n👋 Goodbye!");
      break;
    }

    if (userInput.trim() === "") {
      console.log("⚠️  Please enter a message.");
      continue;
    }

    conversationHistory.push(userInput);

    try {
      console.log("\n⏳ Processing...\n");

      // Build conversation context
      // For now, we'll send the current message with context
      // In a real implementation, you'd maintain full conversation history
      const contextMessage =
        conversationHistory.length > 1
          ? `Previous conversation:\n${conversationHistory
              .slice(0, -1)
              .map((msg, i) => `Step ${i + 1}: ${msg}`)
              .join("\n")}\n\nCurrent message: ${userInput}`
          : userInput;

      const results = await runYieldAgent([contextMessage], {
        modelName: "gpt-4o-mini",
        temperature: 0,
      });

      const result = results[0];
      displayResponse(result, stepNumber);

      stepNumber++;

      // Check if we have a transaction (end of flow)
      const response = result.response as AgentResponseData | undefined;
      if (
        response?.depositTransaction ||
        response?.step === "quick_mode_complete"
      ) {
        console.log("✅ Transaction flow completed!");
        const continueFlow = await question(
          "\nDo you want to start a new test? (y/n): "
        );
        if (continueFlow.toLowerCase() !== "y") {
          break;
        }
        conversationHistory.length = 0;
        stepNumber = 1;
      }
    } catch (error) {
      console.error("\n❌ Error:", error);
      if (error instanceof Error) {
        console.error("   Message:", error.message);
      }
    }
  }

  rl.close();
}

// Example test scenarios
async function runExampleScenario(): Promise<void> {
  console.log("📋 Example Test Scenarios:\n");
  console.log("1. Token name only → Chain → Protocol → Transaction");
  console.log("2. Token address without chain (should error)");
  console.log("3. Quick mode (all parameters at once)");
  console.log("4. Invalid token name");
  console.log("5. Invalid chain selection");
  console.log("6. Custom (manual input)\n");

  const choice = await question("Select scenario (1-6): ");

  const scenarios: Record<string, string[]> = {
    "1": [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aave protocol",
      "Amount is 100 USDC, user address is 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    "2": [
      "Find staking opportunities for 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    ],
    "3": [
      "Deposit 100 USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum to Aave for user 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    "4": ["Find staking opportunities for FAKETOKEN123"],
    "5": [
      "Find staking opportunities for USDC",
      "I want to use FakeChain chain",
    ],
  };

  if (choice === "6") {
    await runInteractiveTest();
    return;
  }

  const steps = scenarios[choice];
  if (!steps) {
    console.log("❌ Invalid choice");
    rl.close();
    return;
  }

  console.log(`\n🧪 Running scenario ${choice}...\n`);

  for (let i = 0; i < steps.length; i++) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Step ${i + 1}: ${steps[i]}`);
    console.log(`${"=".repeat(80)}\n`);

    try {
      const results = await runYieldAgent([steps[i]], {
        modelName: "gpt-4o-mini",
        temperature: 0,
      });

      displayResponse(results[0], i + 1);

      // Wait between steps
      if (i < steps.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error("❌ Error:", error);
    }
  }

  rl.close();
}

// Main execution
const args = process.argv.slice(2);
if (args.includes("--example")) {
  runExampleScenario().catch(console.error);
} else {
  runInteractiveTest().catch(console.error);
}
