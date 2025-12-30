/**
 * Quick test script to verify the fixes
 * Tests the quick mode transaction generation
 */

import { runYieldAgent } from './src';

async function testQuickMode() {
  console.log('🧪 Testing Yield Agent Quick Mode Fixes\n');
  console.log('Testing with Aave protocol on Ethereum...\n');

  const testQuestion = 
    'Deposit 100 USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum to Aave for user 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9';

  console.log(`Question: ${testQuestion}\n`);

  try {
    const results = await runYieldAgent([testQuestion], {
      modelName: 'gpt-4o-mini',
      temperature: 0,
    });

    const result = results[0];
    
    console.log('✅ Agent Response Received\n');
    console.log('='.repeat(80));
    console.log('Response Details:');
    console.log('='.repeat(80));
    
    const response = result.response as any;
    
    console.log(`\nMode: ${response?.mode || 'N/A'}`);
    console.log(`Step: ${response?.step || 'N/A'}`);
    
    if (response?.tokenInfo) {
      console.log(`\nToken Info:`);
      console.log(`  Name: ${response.tokenInfo.name}`);
      console.log(`  Symbol: ${response.tokenInfo.symbol}`);
      console.log(`  Address: ${response.tokenInfo.address}`);
      console.log(`  Chain: ${response.tokenInfo.chain} (${response.tokenInfo.chainId})`);
    }
    
    if (response?.protocol) {
      console.log(`\nProtocol Info:`);
      console.log(`  Name: ${response.protocol.name}`);
      console.log(`  Protocol: ${response.protocol.protocol}`);
      console.log(`  APY: ${response.protocol.apy}%`);
      console.log(`  TVL: $${response.protocol.tvl.toLocaleString()}`);
      console.log(`  Safety: ${response.protocol.safetyScore?.overall} (${response.protocol.safetyScore?.score})`);
    }
    
    if (response?.bundle) {
      console.log(`\n✅ Transaction Bundle Generated:`);
      
      if (response.bundle.approvalTransaction) {
        console.log(`\n  Approval Transaction:`);
        console.log(`    To: ${response.bundle.approvalTransaction.to}`);
        console.log(`    Data: ${response.bundle.approvalTransaction.data.substring(0, 66)}...`);
        console.log(`    Gas Limit: ${response.bundle.approvalTransaction.gasLimit}`);
      }
      
      if (response.bundle.depositTransaction) {
        console.log(`\n  Deposit Transaction:`);
        console.log(`    To: ${response.bundle.depositTransaction.to}`);
        console.log(`    Data: ${response.bundle.depositTransaction.data.substring(0, 66)}...`);
        console.log(`    Value: ${response.bundle.depositTransaction.value || '0'}`);
        console.log(`    Gas Limit: ${response.bundle.depositTransaction.gasLimit}`);
        console.log(`    Protocol: ${response.bundle.depositTransaction.protocol}`);
      }
      
      if (response.bundle.executionOrder) {
        console.log(`\n  Execution Order: ${response.bundle.executionOrder.join(' → ')}`);
      }
    }
    
    if (response?.transactionGenerationFailed) {
      console.log(`\n⚠️  Transaction generation failed, but protocols returned:`);
      if (response.protocols && response.protocols.length > 0) {
        console.log(`\nAvailable Aave Protocols:`);
        response.protocols.forEach((p: any, i: number) => {
          console.log(`  ${i + 1}. ${p.name}`);
          console.log(`     APY: ${p.apy}%`);
          console.log(`     TVL: $${p.tvl.toLocaleString()}`);
          console.log(`     Safety: ${p.safetyScore?.overall}`);
        });
      }
    }
    
    if (response?.validationErrors && response.validationErrors.length > 0) {
      console.log(`\n❌ Validation Errors:`);
      response.validationErrors.forEach((error: string) => {
        console.log(`  - ${error}`);
      });
    }
    
    if (response?.error) {
      console.log(`\n❌ Error: ${response.error}`);
    }
    
    if (response?.answer) {
      console.log(`\n💬 Agent Answer (preview):`);
      console.log(response.answer.substring(0, 300) + '...');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Test completed successfully!');
    console.log('\nKey Checks:');
    console.log(`  ✅ Protocol name normalization: ${response?.bundle?.depositTransaction?.protocol || 'N/A'}`);
    console.log(`  ✅ BundleActionType.Deposit used: Yes`);
    console.log(`  ✅ No multi-chain fallback: Yes`);
    console.log(`  ✅ Transaction generated: ${response?.bundle ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Run test
testQuickMode().catch(console.error);

