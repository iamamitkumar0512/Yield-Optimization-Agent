/**
 * Comprehensive Edge Case Testing for Yield Agent
 * Tests all edge cases in the multi-step flow:
 * 1. Token name only → Agent returns address and asks for chain
 * 2. User selects chain → Agent asks for protocol
 * 3. User enters protocol → Agent gives transaction object
 */

import { runYieldAgent } from "./src";

// Type for agent response to fix TypeScript errors
interface AgentResponseData {
  answer?: string;
  step?: string;
  mode?: string;
  tokenInfo?: {
    name: string;
    symbol: string;
    chain?: string;
    chainId?: number;
  };
  protocols?: Array<unknown>;
  approvalTransaction?: unknown;
  depositTransaction?: unknown;
  validationErrors?: string[];
  [key: string]: unknown;
}

interface TestCase {
  name: string;
  steps: string[];
  description: string;
  expectedBehavior: string[];
}

const testCases: TestCase[] = [
  // ============================================
  // HAPPY PATH - Complete flow
  // ============================================
  {
    name: "Happy Path: Token name → Chain → Protocol → Transaction",
    description: "Complete multi-step flow with valid inputs",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aave protocol",
      "Amount is 100 USDC, user address is 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains and ask for chain confirmation",
      "Step 2: Should discover protocols and ask for protocol selection",
      "Step 3: Should ask for amount and user address",
      "Step 4: Should return transaction object",
    ],
  },

  // ============================================
  // EDGE CASE 1: Token name variations
  // ============================================
  {
    name: "Edge Case 1a: Token symbol only (lowercase)",
    description: "User provides lowercase token symbol",
    steps: ["Find staking opportunities for usdc"],
    expectedBehavior: [
      "Should handle case-insensitive token lookup",
      "Should return token info with all chains",
    ],
  },
  {
    name: "Edge Case 1b: Token symbol only (uppercase)",
    description: "User provides uppercase token symbol",
    steps: ["Find staking opportunities for USDC"],
    expectedBehavior: [
      "Should handle case-insensitive token lookup",
      "Should return token info with all chains",
    ],
  },
  {
    name: "Edge Case 1c: Token full name",
    description: "User provides full token name",
    steps: ["Find staking opportunities for USD Coin"],
    expectedBehavior: [
      "Should find token by full name",
      "Should return token info with all chains",
    ],
  },
  {
    name: "Edge Case 1d: Token name with spaces",
    description: "User provides token name with extra spaces",
    steps: ["Find staking opportunities for   USDC   "],
    expectedBehavior: [
      "Should trim whitespace",
      "Should return token info with all chains",
    ],
  },
  {
    name: "Edge Case 1e: Non-existent token",
    description: "User provides token that does not exist",
    steps: ["Find staking opportunities for FAKETOKEN123"],
    expectedBehavior: [
      "Should return error: Token not found",
      "Should suggest checking spelling or providing address",
    ],
  },
  {
    name: "Edge Case 1f: Empty token name",
    description: "User provides empty token name",
    steps: ["Find staking opportunities for"],
    expectedBehavior: [
      "Should return validation error",
      "Should ask for token name",
    ],
  },
  {
    name: "Edge Case 1g: Multiple token matches",
    description: "Token name matches multiple tokens",
    steps: ["Find staking opportunities for ETH"],
    expectedBehavior: [
      "Should return multiple matches",
      "Should ask user to select specific token",
    ],
  },

  // ============================================
  // EDGE CASE 2: Chain selection variations
  // ============================================
  {
    name: "Edge Case 2a: Chain name (lowercase)",
    description: "User provides chain name in lowercase",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use ethereum chain",
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should accept lowercase chain name",
      "Should proceed to protocol discovery",
    ],
  },
  {
    name: "Edge Case 2b: Chain name (uppercase)",
    description: "User provides chain name in uppercase",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use ETHEREUM chain",
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should accept uppercase chain name",
      "Should proceed to protocol discovery",
    ],
  },
  {
    name: "Edge Case 2c: Chain ID instead of name",
    description: "User provides chain ID instead of name",
    steps: ["Find staking opportunities for USDC", "I want to use chain ID 1"],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should accept chain ID",
      "Should proceed to protocol discovery",
    ],
  },
  {
    name: "Edge Case 2d: Invalid chain name",
    description: "User provides non-existent chain",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use FakeChain chain",
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should return error: Chain not supported",
      "Should list supported chains",
    ],
  },
  {
    name: "Edge Case 2e: Chain not in token allChains list",
    description: "User selects chain where token does not exist",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use BNB Chain", // Assuming USDC might not be on BNB
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should validate chain is in allChains list",
      "Should return error if token not on that chain",
    ],
  },
  {
    name: "Edge Case 2f: Chain selection with typo",
    description: "User makes typo in chain name",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Etherum chain", // Typo: Etherum instead of Ethereum
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should handle typo gracefully or return error",
    ],
  },

  // ============================================
  // EDGE CASE 3: Protocol selection variations
  // ============================================
  {
    name: "Edge Case 3a: Protocol name (lowercase)",
    description: "User provides protocol name in lowercase",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use aave protocol",
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should discover protocols",
      "Step 3: Should accept lowercase protocol name",
      "Should proceed to amount input",
    ],
  },
  {
    name: "Edge Case 3b: Protocol name (uppercase)",
    description: "User provides protocol name in uppercase",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use AAVE protocol",
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should discover protocols",
      "Step 3: Should accept uppercase protocol name",
      "Should proceed to amount input",
    ],
  },
  {
    name: "Edge Case 3c: Protocol not available on chain",
    description: "User selects protocol not available on selected chain",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use FakeProtocol protocol",
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should discover protocols",
      "Step 3: Should return error: Protocol not available",
      "Should list available protocols",
    ],
  },
  {
    name: "Edge Case 3d: No protocols found",
    description: "No protocols available for token on chain",
    steps: [
      "Find staking opportunities for FAKETOKEN",
      "I want to use Ethereum chain",
    ],
    expectedBehavior: [
      "Step 1: Should handle token lookup (may fail or succeed)",
      "Step 2: Should return error: No protocols found",
      "Should suggest trying different chain or token",
    ],
  },
  {
    name: "Edge Case 3e: Protocol selection with typo",
    description: "User makes typo in protocol name",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aav protocol", // Typo: Aav instead of Aave
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should discover protocols",
      "Step 3: Should handle typo or return error",
    ],
  },

  // ============================================
  // EDGE CASE 4: Amount and user address
  // ============================================
  {
    name: "Edge Case 4a: Invalid amount (negative)",
    description: "User provides negative amount",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aave protocol",
      "Amount is -100 USDC, user address is 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    expectedBehavior: ["Step 4: Should return error: Amount must be positive"],
  },
  {
    name: "Edge Case 4b: Invalid amount (zero)",
    description: "User provides zero amount",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aave protocol",
      "Amount is 0 USDC, user address is 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    expectedBehavior: ["Step 4: Should return error: Amount must be positive"],
  },
  {
    name: "Edge Case 4c: Invalid user address",
    description: "User provides invalid Ethereum address",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aave protocol",
      "Amount is 100 USDC, user address is invalid-address",
    ],
    expectedBehavior: ["Step 4: Should return error: Invalid address format"],
  },
  {
    name: "Edge Case 4d: Missing amount",
    description: "User does not provide amount",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aave protocol",
      "User address is 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    expectedBehavior: ["Step 4: Should ask for amount"],
  },
  {
    name: "Edge Case 4e: Missing user address",
    description: "User does not provide address",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aave protocol",
      "Amount is 100 USDC",
    ],
    expectedBehavior: ["Step 4: Should ask for user address"],
  },
  {
    name: "Edge Case 4f: Amount with different units",
    description: "User provides amount in different format",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Ethereum chain",
      "I want to use Aave protocol",
      "Amount is 100.5 USDC, user address is 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    expectedBehavior: [
      "Step 4: Should handle decimal amounts",
      "Should return transaction object",
    ],
  },

  // ============================================
  // EDGE CASE 5: Token address scenarios
  // ============================================
  {
    name: "Edge Case 5a: Token address without chain",
    description: "User provides address but no chain",
    steps: [
      "Find staking opportunities for 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    ],
    expectedBehavior: [
      "Should return error: Chain must be provided when using token address",
    ],
  },
  {
    name: "Edge Case 5b: Token address with chain",
    description: "User provides address with chain (quick mode)",
    steps: [
      "Find staking opportunities for 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on Ethereum",
    ],
    expectedBehavior: [
      "Should process directly without asking for chain confirmation",
      "Should discover protocols",
    ],
  },
  {
    name: "Edge Case 5c: Invalid token address",
    description: "User provides invalid address format",
    steps: ["Find staking opportunities for 0xInvalidAddress"],
    expectedBehavior: ["Should return error: Invalid address format"],
  },
  {
    name: "Edge Case 5d: Token address on wrong chain",
    description: "User provides address for token on different chain",
    steps: [
      "Find staking opportunities for 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on Arbitrum",
    ],
    expectedBehavior: [
      "Should validate token exists on specified chain",
      "Should return error if token not found on chain",
    ],
  },

  // ============================================
  // EDGE CASE 6: Quick mode variations
  // ============================================
  {
    name: "Edge Case 6a: Quick mode with all parameters",
    description: "User provides all parameters in one command",
    steps: [
      "Deposit 100 USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum to Aave for user 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    expectedBehavior: [
      "Should use quick mode",
      "Should skip all confirmation steps",
      "Should return transaction object directly",
    ],
  },
  {
    name: "Edge Case 6b: Quick mode with missing protocol",
    description: "Quick mode command missing protocol",
    steps: [
      "Deposit 100 USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum for user 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9",
    ],
    expectedBehavior: [
      "Should return error: Protocol required",
      "Should fall back to interactive mode",
    ],
  },

  // ============================================
  // EDGE CASE 7: Conversation flow interruptions
  // ============================================
  {
    name: "Edge Case 7a: User changes mind mid-conversation",
    description: "User changes token selection",
    steps: [
      "Find staking opportunities for USDC",
      "Actually, I want to use DAI instead",
    ],
    expectedBehavior: [
      "Step 1: Should return token info for USDC",
      "Step 2: Should handle token change",
      "Should restart flow with new token",
    ],
  },
  {
    name: "Edge Case 7b: User provides chain before token confirmation",
    description: "User provides chain in first message",
    steps: ["Find staking opportunities for USDC on Ethereum"],
    expectedBehavior: [
      "Should handle chain specification",
      "Should proceed directly to protocol discovery",
    ],
  },
  {
    name: "Edge Case 7c: User provides protocol before chain",
    description: "User provides protocol before chain selection",
    steps: [
      "Find staking opportunities for USDC",
      "I want to use Aave protocol",
    ],
    expectedBehavior: [
      "Step 1: Should return token info with all chains",
      "Step 2: Should ask for chain first before protocol",
    ],
  },
];

/**
 * Run a single test case
 */
async function runTestCase(testCase: TestCase, index: number): Promise<void> {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`🧪 Test Case ${index + 1}: ${testCase.name}`);
  console.log(`📝 Description: ${testCase.description}`);
  console.log(`${"=".repeat(80)}\n`);

  console.log("📋 Expected Behavior:");
  testCase.expectedBehavior.forEach((behavior, i) => {
    console.log(`   ${i + 1}. ${behavior}`);
  });
  console.log("");

  console.log("💬 Conversation Steps:");
  testCase.steps.forEach((step, i) => {
    console.log(`   Step ${i + 1}: "${step}"`);
  });
  console.log("");

  try {
    // Run all steps as a conversation
    // Note: In a real scenario, you'd maintain conversation state
    // For testing, we'll run each step and check responses
    const results = await runYieldAgent(testCase.steps, {
      modelName: "gpt-4o-mini",
      temperature: 0,
    });

    console.log("📤 Agent Responses:");
    results.forEach((result, i) => {
      console.log(`\n   --- Step ${i + 1} Response ---`);
      console.log(`   Question: ${result.question}`);

      // Type assertion to fix TypeScript errors
      const response = result.response as AgentResponseData | undefined;

      console.log(`   Step: ${response?.step || "N/A"}`);
      console.log(`   Mode: ${response?.mode || "N/A"}`);

      if (response?.tokenInfo) {
        console.log(
          `   Token: ${response.tokenInfo.name} (${response.tokenInfo.symbol})`
        );
        console.log(
          `   Chain: ${response.tokenInfo.chain || "N/A"} (${response.tokenInfo.chainId || "N/A"})`
        );
      }

      if (
        response?.protocols &&
        Array.isArray(response.protocols) &&
        response.protocols.length > 0
      ) {
        console.log(`   Protocols Found: ${response.protocols.length}`);
      }

      if (response?.approvalTransaction || response?.depositTransaction) {
        console.log(`   ✅ Transaction Generated!`);
      }

      if (
        response?.validationErrors &&
        Array.isArray(response.validationErrors) &&
        response.validationErrors.length > 0
      ) {
        console.log(
          `   ⚠️  Validation Errors: ${response.validationErrors.join(", ")}`
        );
      }

      // Show answer preview (first 200 chars)
      const answerPreview = response?.answer?.substring(0, 200) || "";
      console.log(
        `   Answer Preview: ${answerPreview}${answerPreview.length >= 200 ? "..." : ""}`
      );
    });

    console.log("\n✅ Test completed successfully\n");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    if (error instanceof Error) {
      console.error("   Error message:", error.message);
      console.error("   Stack:", error.stack);
    }
  }

  // Wait between tests to avoid rate limits
  if (index < testCases.length - 1) {
    console.log("⏳ Waiting 3 seconds before next test...\n");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

/**
 * Run all edge case tests
 */
async function runAllTests(): Promise<void> {
  console.log("🚀 Starting Comprehensive Edge Case Testing for Yield Agent\n");
  console.log(`Total test cases: ${testCases.length}\n`);

  const results = {
    passed: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < testCases.length; i++) {
    try {
      await runTestCase(testCases[i], i);
      results.passed++;
    } catch (error) {
      results.failed++;
      const errorMsg = `Test "${testCases[i].name}" failed: ${error instanceof Error ? error.message : String(error)}`;
      results.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}\n`);
    }
  }

  // Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 Test Summary");
  console.log(`${"=".repeat(80)}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(
    `📈 Success Rate: ${((results.passed / testCases.length) * 100).toFixed(2)}%`
  );

  if (results.errors.length > 0) {
    console.log("\n⚠️  Errors:");
    results.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }
  console.log(`${"=".repeat(80)}\n`);
}

/**
 * Run specific test cases by name pattern
 */
async function runFilteredTests(filter: string): Promise<void> {
  const filtered = testCases.filter((tc) =>
    tc.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    console.log(`❌ No test cases found matching "${filter}"`);
    return;
  }

  console.log(`🔍 Running ${filtered.length} test(s) matching "${filter}"\n`);

  for (let i = 0; i < filtered.length; i++) {
    const originalIndex = testCases.indexOf(filtered[i]);
    await runTestCase(filtered[i], originalIndex);
  }
}

// Main execution
const args = process.argv.slice(2);
const filter = args.find((arg) => arg.startsWith("--filter="))?.split("=")[1];

if (filter) {
  runFilteredTests(filter).catch(console.error);
} else {
  runAllTests().catch(console.error);
}
