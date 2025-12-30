/**
 * Test scenarios for the yield agent
 * Tests all different input scenarios
 */

import { runYieldAgent } from './src';

async function testScenarios() {
  console.log('🧪 Testing Yield Agent Scenarios\n');

  const scenarios = [
    {
      name: 'Scenario 1: Token symbol only (USDC)',
      question: 'Find staking opportunities for USDC',
      expected: 'Should show all chains and ask for confirmation',
    },
    {
      name: 'Scenario 2: Token address without chain',
      question: 'Find staking opportunities for 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      expected: 'Should return error requiring chain',
    },
    {
      name: 'Scenario 3: Token address with chain',
      question: 'Find staking opportunities for 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on Ethereum',
      expected: 'Should process directly without asking for confirmation',
    },
    {
      name: 'Scenario 4: Token name (Ethereum)',
      question: 'Find staking opportunities for ETH',
      expected: 'Should show all chains and ask for confirmation',
    },
  ];

  for (const scenario of scenarios) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${scenario.name}`);
    console.log(`❓ Question: ${scenario.question}`);
    console.log(`✅ Expected: ${scenario.expected}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const results = await runYieldAgent([scenario.question], {
        modelName: 'gpt-4o-mini',
        temperature: 0,
      });

      const result = results[0];
      console.log('📤 Response:');
      console.log(JSON.stringify(result.response, null, 2));
      console.log('\n');
    } catch (error) {
      console.error('❌ Error:', error);
    }

    // Wait between tests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

// Run tests
testScenarios().catch(console.error);

