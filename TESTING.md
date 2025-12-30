# Testing Guide for Yield Agent

This guide explains how to test the yield-agent, including all edge cases and multi-step conversation flows.

## Test Scripts

### 1. Edge Cases Test Suite (`test-edge-cases.ts`)

Comprehensive automated test suite covering all edge cases in the multi-step flow.

**Run all edge case tests:**
```bash
yarn test:edge-cases
# or
tsx test-edge-cases.ts
```

**Run filtered tests (by name pattern):**
```bash
yarn test:edge-cases:filter=token
# or
tsx test-edge-cases.ts --filter=token
```

**What it tests:**
- ✅ Token name variations (lowercase, uppercase, full name, with spaces)
- ✅ Non-existent tokens
- ✅ Multiple token matches
- ✅ Chain selection variations (name, ID, invalid chains)
- ✅ Protocol selection variations
- ✅ Amount and user address validation
- ✅ Token address scenarios (with/without chain)
- ✅ Quick mode variations
- ✅ Conversation flow interruptions

**Test Categories:**
1. **Happy Path** - Complete flow with valid inputs
2. **Token Name Edge Cases** - Various token input formats
3. **Chain Selection Edge Cases** - Chain validation and selection
4. **Protocol Selection Edge Cases** - Protocol discovery and selection
5. **Amount & Address Edge Cases** - Input validation
6. **Token Address Scenarios** - Address-based inputs
7. **Quick Mode Variations** - All-in-one commands
8. **Conversation Flow** - Flow interruptions and changes

### 2. Interactive Test (`test-interactive.ts`)

Manual step-by-step testing tool for exploring the agent's behavior.

**Run interactive mode:**
```bash
yarn test:interactive
# or
tsx test-interactive.ts
```

**Run example scenarios:**
```bash
yarn test:interactive:example
# or
tsx test-interactive.ts --example
```

**Features:**
- Step-by-step conversation simulation
- Real-time response display
- Token information display
- Protocol discovery results
- Transaction object preview
- Error handling visualization

## Test Flow Examples

### Example 1: Complete Multi-Step Flow

```
Step 1: "Find staking opportunities for USDC"
  → Agent returns token info with all chains
  → Agent asks: "Please confirm which chain and address you want to use"

Step 2: "I want to use Ethereum chain"
  → Agent discovers protocols on Ethereum
  → Agent asks: "Please select a protocol"

Step 3: "I want to use Aave protocol"
  → Agent asks: "Please provide amount and user address"

Step 4: "Amount is 100 USDC, user address is 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9"
  → Agent generates transaction object
  → Agent returns approval + deposit transactions
```

### Example 2: Quick Mode

```
Step 1: "Deposit 100 USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum to Aave for user 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9"
  → Agent processes all parameters at once
  → Agent returns transaction object directly (skips confirmations)
```

### Example 3: Error Handling

```
Step 1: "Find staking opportunities for 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  → Agent returns error: "Chain must be provided when using token address"
```

## Edge Cases Covered

### Token Input Edge Cases
- ✅ Token symbol only (lowercase/uppercase)
- ✅ Token full name
- ✅ Token name with extra spaces
- ✅ Non-existent token
- ✅ Empty token name
- ✅ Multiple token matches
- ✅ Token address without chain (should error)
- ✅ Token address with chain (quick mode)
- ✅ Invalid token address format

### Chain Selection Edge Cases
- ✅ Chain name (lowercase/uppercase)
- ✅ Chain ID instead of name
- ✅ Invalid chain name
- ✅ Chain not in token's allChains list
- ✅ Chain selection with typo

### Protocol Selection Edge Cases
- ✅ Protocol name (lowercase/uppercase)
- ✅ Protocol not available on chain
- ✅ No protocols found
- ✅ Protocol selection with typo

### Amount & Address Edge Cases
- ✅ Invalid amount (negative/zero)
- ✅ Invalid user address format
- ✅ Missing amount
- ✅ Missing user address
- ✅ Decimal amounts

### Quick Mode Edge Cases
- ✅ All parameters provided
- ✅ Missing protocol in quick mode
- ✅ Invalid parameters in quick mode

### Conversation Flow Edge Cases
- ✅ User changes mind mid-conversation
- ✅ User provides chain before token confirmation
- ✅ User provides protocol before chain

## Expected Behaviors

### Step 1: Token Name Only
**Input:** `"Find staking opportunities for USDC"`

**Expected Response:**
- `step: "token_confirmation"`
- `tokenInfo` with all chains
- `requiresConfirmation: true`
- Message asking user to select chain

### Step 2: Chain Selection
**Input:** `"I want to use Ethereum chain"`

**Expected Response:**
- `step: "protocol_discovery"`
- `protocols` array with available protocols
- Message asking user to select protocol

### Step 3: Protocol Selection
**Input:** `"I want to use Aave protocol"`

**Expected Response:**
- `step: "amount_input"`
- Message asking for amount and user address

### Step 4: Amount & Address
**Input:** `"Amount is 100 USDC, user address is 0x..."`

**Expected Response:**
- `step: "transaction_ready"`
- `approvalTransaction` (if needed)
- `depositTransaction`
- Safety warnings included

## Running Tests

### Prerequisites
1. Set up environment variables:
   ```bash
   cp .env.example .env
   # Add your OPENAI_API_KEY and ENSO_API_KEY
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

### Run All Edge Case Tests
```bash
yarn test:edge-cases
```

### Run Specific Test Category
```bash
# Test only token-related edge cases
yarn test:edge-cases:filter=token

# Test only chain-related edge cases
yarn test:edge-cases:filter=chain

# Test only protocol-related edge cases
yarn test:edge-cases:filter=protocol
```

### Interactive Testing
```bash
# Manual step-by-step testing
yarn test:interactive

# Run pre-defined example scenarios
yarn test:interactive:example
```

## Test Output

Each test displays:
- ✅ Test case name and description
- ✅ Expected behaviors
- ✅ Conversation steps
- ✅ Agent responses with:
  - Step status
  - Token information
  - Protocols found
  - Transaction objects
  - Validation errors
  - Answer preview

## Tips for Testing

1. **Start with Happy Path**: Test the complete flow first to ensure basic functionality works
2. **Test Edge Cases**: Run through all edge cases to verify error handling
3. **Use Interactive Mode**: Use interactive mode to explore unexpected scenarios
4. **Check Response Structure**: Verify that responses match the expected schema
5. **Monitor Rate Limits**: Tests include delays to avoid API rate limits

## Troubleshooting

### Rate Limit Errors
- Tests include automatic delays between requests
- If you hit rate limits, increase delays in test files

### Token Not Found
- Verify token name spelling
- Try using token address with chain instead

### Protocol Not Found
- Some tokens may not have protocols on certain chains
- Try different chains or tokens

### Invalid Address Format
- Ensure addresses are valid Ethereum addresses (checksummed)
- Use `viem`'s `isAddress` for validation

## Contributing

When adding new edge cases:
1. Add test case to `test-edge-cases.ts`
2. Update this documentation
3. Run tests to verify they work
4. Ensure tests follow the existing pattern

