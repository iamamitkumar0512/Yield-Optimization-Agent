# Yield Optimization Agent with tx data

An AI-powered agent that helps users find the best and safest staking opportunities for their tokens across multiple DeFi protocols and chains with transaction data generation.

```
================================================================================
    YIELD OPTIMIZATION AGENT
    Cross-Chain DeFi Yield Discovery & Transaction Generation
================================================================================

    "Find staking opportunities for 10k USDC on Ethereum"

                        |
                        v

    +----------------------------------------------------------+
    |  #1  Aave v3                                             |
    |      USDC on Ethereum                                    |
    |                                                          |
    |      APY: 5.20%        Safety Score: 9.5/10             |
    |      TVL: $150.00M     Risk: [**........] 2.0/10 LOW   |
    |                                                          |
    |      Transaction Bundle:                                 |
    |      ✓ Approval Transaction                              |
    |      ✓ Deposit Transaction                               |
    |                                                          |
    |      ⚠️ Safety warnings included                         |
    +----------------------------------------------------------+

================================================================================
```

## Overview

The Yield Optimization Agent takes natural language queries and returns ranked yield opportunities across multiple blockchain networks. It analyzes APY, TVL, risk scores, audit status, protocol age, and generates ready-to-execute transaction bundles using the Enso SDK.

### Key Features

- **Natural Language Understanding**: Ask questions like "Find staking opportunities for USDC" or "What protocols can I stake ETH on Arbitrum?"
- **Multi-Chain Support**: Ethereum, Arbitrum, Optimism, Polygon, Base, Avalanche, BNB Chain
- **Token Discovery**: Search tokens by name, symbol, or contract address
- **Protocol Discovery**: Automatically find all available staking protocols for any token
- **Safety Evaluation**: Comprehensive safety scoring based on TVL, reputation, audits, and history
- **Transaction Generation**: Generate approval and deposit transactions using Enso SDK
- **Safety First**: Mandatory safety warnings and comprehensive validation
- **Optimized**: Returns top protocols only to minimize API usage and token consumption
- **Rate Limit Handling**: Automatic retry with exponential backoff for API rate limits
- **REST API**: Production-ready HTTP API with Swagger documentation

## Architecture

```
+------------------------------------------------------------------+
|                    YIELD OPTIMIZATION AGENT                       |
+------------------------------------------------------------------+
|                                                                   |
|   START                                                           |
|     |                                                             |
|     v                                                             |
|   [User Query] -----> Natural language input                      |
|     |                                                             |
|     v                                                             |
|   [LLM Agent] -------> OpenAI GPT-4o-mini (LangGraph)            |
|     |                                                             |
|     v                                                             |
|   [Token Discovery] -> CoinGecko API / Mock Data                  |
|     |                                                             |
|     v                                                             |
|   [Protocol Discovery] -> Enso SDK (Multi-chain vault search)     |
|     |                                                             |
|     v                                                             |
|   [Safety Evaluation] -> TVL, reputation, protocol age scoring   |
|     |                                                             |
|     v                                                             |
|   [Rank & Score] -----> Sort by safety + yield (top 15)          |
|     |                                                             |
|     v                                                             |
|   [Generate Transactions] -> Enso SDK (approval + deposit)        |
|     |                                                             |
|     v                                                             |
|   [Format Response] ---> Structured JSON with safety warnings    |
|     |                                                             |
|     v                                                             |
|   END                                                             |
|                                                                   |
+------------------------------------------------------------------+
```

## Quick Start

### Prerequisites

- **Node.js** 18+ and **Yarn** package manager
- API keys for required services (see Configuration section)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd yield-agent

# Install dependencies
yarn install
```

### Configuration

Create a `.env` file in the root directory:

```env
# ============================================
# REQUIRED - Must be set for agent to work
# ============================================
OPENAI_API_KEY=your_openai_api_key
ENSO_API_KEY=your_enso_api_key

# ============================================
# OPTIONAL - Recommended for production
# ============================================
# Token information (uses mock data if not provided)
COINGECKO_API_KEY=your_coingecko_demo_api_key

# ============================================
# OPTIONAL - API Server Configuration
# ============================================
PORT=3000                    # Default: 3000
NODE_ENV=development         # Default: development
CORS_ORIGIN=*                # Default: *
RATE_LIMIT_MAX=100           # Default: 100 requests per window

# ============================================
# OPTIONAL - Debugging
# ============================================
DEBUG=false                  # Enable debug logging
```

#### Environment Variables Reference

| Variable            | Required   | Default       | Description                                                                                |
| ------------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------ |
| `OPENAI_API_KEY`    | ✅ **Yes** | -             | OpenAI API key for LLM agent reasoning                                                     |
| `ENSO_API_KEY`      | ✅ **Yes** | -             | Enso SDK API key for protocol discovery and transaction generation                         |
| `COINGECKO_API_KEY` | ❌ No      | -             | CoinGecko API key for token information. If not provided, uses mock data for common tokens |
| `PORT`              | ❌ No      | `3000`        | Port for REST API server                                                                   |
| `NODE_ENV`          | ❌ No      | `development` | Environment mode (`development` or `production`)                                           |
| `CORS_ORIGIN`       | ❌ No      | `*`           | CORS origin for API server                                                                 |
| `RATE_LIMIT_MAX`    | ❌ No      | `100`         | Maximum requests per rate limit window                                                     |
| `DEBUG`             | ❌ No      | `false`       | Enable debug logging                                                                       |

**Important Notes:**

- **OPENAI_API_KEY** and **ENSO_API_KEY** are **mandatory** - the agent will not work without them
- **COINGECKO_API_KEY** is optional - the agent uses fallback mock data for common tokens if not provided
- For production use, a CoinGecko demo API key is recommended for accurate token information

### Run Locally

#### REST API (Recommended)

```bash
# Start the API server
yarn start:api

# Or with auto-reload for development
yarn dev:api
```

**Access the Swagger UI:** `http://localhost:3000/api-docs`

**Health Check:** `http://localhost:3000/health`

#### Programmatic Usage (TypeScript/JavaScript)

```typescript
import { runYieldAgent } from "./src";

const questions = [
  "Find staking opportunities for USDC",
  "What protocols can I stake ETH on Arbitrum?",
];

const results = await runYieldAgent(questions);
```

#### Example API Request

```bash
curl -X POST http://localhost:3000/api/v1/agent/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Find staking opportunities for USDC on Ethereum"}'
```

## Usage

### REST API Endpoints

The REST API provides the following endpoints:

#### Agent Endpoints

- `POST /api/v1/agent/query` - Natural language queries to the AI agent
- `POST /api/v1/agent/batch` - Batch processing (up to 10 queries)
- `POST /api/v1/agent/quick` - Quick transaction generation

#### Token Endpoints

- `GET /api/v1/tokens/search?query=USDC` - Search tokens by name/symbol
- `GET /api/v1/tokens/info?token=USDC&chainId=1` - Get detailed token information

#### Protocol Endpoints

- `POST /api/v1/protocols/discover` - Discover staking protocols for a token

#### Transaction Endpoints

- `POST /api/v1/transactions/generate` - Generate transaction bundles

#### Utility Endpoints

- `GET /api/v1/chains` - Get supported chains
- `GET /health` - Health check

👉 **See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference**

### Interactive Mode

The agent guides users through a step-by-step process:

1. **Token Input**: User provides token name or address
2. **Token Confirmation**: Agent fetches and displays token information
3. **Protocol Discovery**: Agent finds all available protocols across chains
4. **Safety Evaluation**: Protocols are ranked by safety and yield
5. **Protocol Selection**: User selects preferred protocol
6. **Transaction Generation**: Agent creates transaction bundle (approval + deposit if needed)

### Quick Mode

Users can provide all information in one command (token address, chain, protocol, amount, and user address):

```
"Deposit 100 USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum to Aave for user 0x2a360629a7332e468b2d30dD0f76e5c41D6cEaA9"
```

The agent will:

- Parse all inputs (token address, chain, protocol, amount, user address)
- Validate token exists on specified chain
- Find the protocol vault
- Evaluate safety score
- Generate transaction bundle immediately (approval + deposit if needed)
- Include all safety warnings

## API Reference

### Core Functions

#### `runYieldAgent(questions, options)`

Run the yield optimization agent with a list of questions.

**Parameters:**

- `questions: string[]` - Array of user questions
- `options?: AgentOptions` - Optional configuration
  - `modelName?: string` - OpenAI model name (default: "gpt-4o-mini")
  - `temperature?: number` - Model temperature (default: 0)
  - `maxTokens?: number` - Maximum tokens per response (default: 4000)
  - `maxRetries?: number` - Maximum retries for rate limits (default: 3)
  - `delayBetweenQuestionsMs?: number` - Delay between questions in ms (default: 2000)

**Returns:** `Promise<AgentResponse[]>`

**Example:**

```typescript
const results = await runYieldAgent(["Find staking for USDC on Arbitrum"], {
  modelName: "gpt-4o-mini",
  temperature: 0,
  maxTokens: 4000,
});
```

### Services

#### Token Info API (`src/agent/api.ts`)

- `getTokenInfo(input, chainId?, chainName?)` - Get token information
- `searchToken(query)` - Search tokens by name/symbol
- `getTokenByAddress(address, chainId)` - Get token by contract address

#### Enso Service (`src/agent/enso-service.ts`)

- `discoverProtocols(tokenAddress, chainId)` - Find protocols on a chain
- `discoverProtocolsMultiChain(tokenAddress)` - Find protocols across all chains
- `checkApprovalNeeded(...)` - Check if token approval is needed
- `generateTransactionBundle(...)` - Generate approval + deposit transactions

#### Safety Service (`src/agent/safety-service.ts`)

- `evaluateProtocolSafety(protocol)` - Evaluate protocol safety score
- `addSafetyScores(protocols, maxProtocols?)` - Add safety scores to protocols (limits evaluation to top protocols by TVL)
- `sortProtocolsBySafetyAndYield(protocols)` - Sort protocols by safety and yield

#### Validation (`src/agent/validation.ts`)

- `validateTokenInput(input)` - Validate token input
- `validateChain(chain)` - Validate chain
- `validateAmount(amount, balance, decimals)` - Validate amount
- `detectQuickMode(input)` - Detect quick mode input
- `parseQuickModeInput(input)` - Parse quick mode input

## Supported Chains

| Chain     | Chain ID | Native Token |
| --------- | -------- | ------------ |
| Ethereum  | 1        | ETH          |
| Arbitrum  | 42161    | ETH          |
| Optimism  | 10       | ETH          |
| Polygon   | 137      | MATIC        |
| Base      | 8453     | ETH          |
| Avalanche | 43114    | AVAX         |
| BNB Chain | 56       | BNB          |

## Safety Scoring

Protocols are evaluated based on a composite scoring system:

### Safety Factors

1. **TVL (Total Value Locked)**

   - > $100M: Very Safe
   - $10M - $100M: Safe
   - < $10M: Risky

2. **Protocol Reputation**

   - Trusted protocols (Aave, Compound, Lido, etc.)
   - Unknown protocols flagged

3. **Audit Status**

   - Protocol audit information (evaluated based on protocol reputation)
   - Audit count and quality assessment

4. **Historical Performance**
   - Protocol age and stability
   - Security incident history

### Safety Warnings

All transaction objects include mandatory warnings:

```
⚠️ CRITICAL: This transaction object was generated by an AI agent.
Please verify all details (token address, protocol address, amount, chain)
before executing. Double-check on block explorer and protocol website.
This is not financial advice.
```

### Input Validation

- **Address Validation**: Validates Ethereum address format and checksum
- **Chain Validation**: Ensures chain is supported
- **Amount Validation**: Verifies amount is positive and within balance
- **Address + Chain Requirement**: When address is provided, chain MUST be specified

### Pre-Transaction Checks

Before generating any transaction, the agent verifies:

- Token exists on specified chain
- Protocol exists for token on chain
- User has sufficient balance
- Protocol safety evaluation
- All parameters are valid

## Transaction Flow

### With Approval Needed

1. Generate approval transaction
2. User executes approval transaction
3. Wait for confirmation
4. Generate deposit transaction
5. User executes deposit transaction

### Without Approval Needed

1. Generate deposit transaction
2. User executes deposit transaction

## Data Sources

| Source      | Data Provided                                          | API Key Required                                  |
| ----------- | ------------------------------------------------------ | ------------------------------------------------- |
| OpenAI      | LLM agent reasoning                                    | ✅ Yes (Required)                                 |
| Enso SDK    | Protocol discovery, transaction generation, vault data | ✅ Yes (Required)                                 |
| CoinGecko   | Token information (name, symbol, price, market cap)    | ❌ No (Optional - uses mock data if not provided) |
| Public RPCs | Chain data, gas prices                                 | ❌ No                                             |

**Note:** The agent uses Enso SDK as the primary source for protocol discovery and transaction generation. CoinGecko is used for token metadata and can fall back to mock data for common tokens if no API key is provided.

## Performance & Optimization

### Protocol Limiting

To optimize API usage and prevent token limit errors, the agent:

1. **Pre-filters by TVL**: Sorts protocols by Total Value Locked and selects top 20
2. **Evaluates safety**: Only evaluates safety scores for top 20 protocols (saves API credits)
3. **Returns top results**: Returns top 15 protocols sorted by safety + yield

This approach ensures:

- ✅ Reduced API credit consumption (evaluating 20 instead of 100+ protocols)
- ✅ No token limit errors (returning 15 instead of 100+ protocols)
- ✅ Best protocols still shown (top by TVL, then sorted by safety + yield)

### Rate Limiting & Retries

The agent includes automatic rate limit handling:

- **Automatic retry**: Retries on 429 rate limit errors with exponential backoff
- **Smart detection**: Distinguishes between rate limits (retryable) and quota issues (not retryable)
- **Configurable delays**: 2 second delay between questions by default
- **Max retries**: Configurable retry attempts (default: 3)

## Deployment

### Self-Hosted

```bash
# Build TypeScript
yarn build

# Start production server
NODE_ENV=production yarn start:api
```

### Docker (Example)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN yarn build

# Expose port
EXPOSE 3000

# Start server
CMD ["yarn", "start:api"]
```

### Environment Variables for Production

Make sure to set all required environment variables in your production environment:

```bash
# Required
OPENAI_API_KEY=your_production_openai_key
ENSO_API_KEY=your_production_enso_key

# Recommended
COINGECKO_API_KEY=your_production_coingecko_key
NODE_ENV=production
PORT=3000
```

## Project Structure

```
yield-agent/
├── src/
│   ├── agent/
│   │   ├── index.ts              # Main agent orchestration
│   │   ├── tools.ts               # LangChain tools
│   │   ├── api.ts                 # CoinGecko integration
│   │   ├── enso-service.ts        # Enso SDK wrapper
│   │   ├── safety-service.ts      # Safety evaluation
│   │   ├── validation.ts          # Input validation
│   │   ├── types.ts               # TypeScript types
│   │   ├── output-structure.ts   # Response schema
│   │   └── system-prompt.ts       # Agent system prompt
│   ├── api/
│   │   ├── server.ts              # Express server setup
│   │   ├── routes.ts              # API route definitions
│   │   ├── controllers.ts         # Request handlers
│   │   ├── middleware.ts          # Validation & error handling
│   │   ├── validation.ts          # Request validation schemas
│   │   ├── swagger.ts             # OpenAPI configuration
│   │   └── index.ts               # API module exports
│   ├── common/
│   │   ├── types.ts
│   │   ├── logger.ts
│   │   └── utils.ts
│   └── index.ts                  # Public API
├── package.json
├── tsconfig.json
├── README.md
├── API_DOCUMENTATION.md          # Complete API reference
└── Yield-Agent-API.postman_collection.json  # Postman collection
```

## Development

### Building

```bash
# Build TypeScript
yarn build

# Run linter
yarn lint

# Format code
yarn prettier
```

### Testing

```bash
# Run unit tests
yarn test

# Test API endpoints
yarn test:api
yarn test:api:full  # Includes AI agent tests
```

### API Testing

The API can be tested using:

1. **Swagger UI**: `http://localhost:3000/api-docs` - Interactive testing interface
2. **Postman**: Import `Yield-Agent-API.postman_collection.json`
3. **Test Script**: Run `yarn test:api` for automated tests

## Dependencies

### Core Agent

- **LangGraph**: Agent framework
- **Enso SDK**: Protocol discovery and transaction generation
- **CoinGecko API**: Token information (optional, uses mock data if not provided)
- **viem**: Ethereum utilities
- **Zod**: Schema validation
- **OpenAI API**: LLM for agent reasoning

### REST API

- **Express.js**: Web framework
- **Swagger UI**: Interactive API documentation
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **express-rate-limit**: Rate limiting

## Error Handling

The agent handles various error cases:

- Token not found
- No protocols available
- Invalid address format
- Unsupported chain
- Insufficient balance
- Network errors
- API rate limiting (with automatic retry)
- Quota/billing issues (with helpful error messages)

All errors include clear messages and suggestions.

## Important Notes

⚠️ **CRITICAL SAFETY REMINDERS:**

1. **Always verify transaction details** before executing
2. **Check token addresses** on block explorer
3. **Verify protocol addresses** on protocol website
4. **Review safety scores** before selecting protocols
5. **Start with small amounts** when trying new protocols
6. **This is not financial advice** - do your own research

## Acknowledgments

- [Warden Protocol](https://wardenprotocol.org/) for the Agent Builder Programme
- [LangGraph](https://www.langchain.com/langgraph) for the agent framework
- [Enso Finance](https://www.enso.finance/) for protocol discovery and transaction generation via Enso SDK
- [CoinGecko](https://www.coingecko.com/) for token information (optional)

---

Built with care for the Warden Protocol ecosystem.
