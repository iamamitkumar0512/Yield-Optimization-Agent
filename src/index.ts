/**
 * Yield Optimization Agent
 * Main entry point for the agent
 */

import dotenv from 'dotenv';
import { runYieldAgent } from './agent';

// Load environment variables
dotenv.config();

/**
 * Example usage of the yield agent
 */
async function main() {
  const questions = [
    'Find staking opportunities for USDC',
    // Add more questions as needed
  ];

  try {
    const results = await runYieldAgent(questions, {
      modelName: 'gpt-4o-mini',
      temperature: 0,
    });

    console.log('\n=== Agent Results ===\n');
    results.forEach((result, index) => {
      console.log(`Question ${index + 1}: ${result.question}`);
      console.log(`Response:`, JSON.stringify(result.response, null, 2));
      console.log('\n---\n');
    });
  } catch (error) {
    console.error('Error running agent:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runYieldAgent } from './agent';
export * from './agent';

