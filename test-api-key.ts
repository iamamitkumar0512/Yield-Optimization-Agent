/**
 * Diagnostic script to test OpenAI API key
 * Run with: tsx test-api-key.ts
 */

import dotenv from "dotenv";
import { ChatOpenAI } from "@langchain/openai";

dotenv.config();

async function testApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY not found in environment variables");
    console.log("\nPlease create a .env file with:");
    console.log("OPENAI_API_KEY=sk-...");
    process.exit(1);
  }

  console.log("🔍 Testing OpenAI API Key...");
  console.log(`Key prefix: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log("");

  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
      apiKey: apiKey,
      maxTokens: 10, // Minimal tokens for testing
    });

    console.log("📤 Sending test request...");
    const response = await model.invoke("Say 'test'");
    
    console.log("✅ API Key is valid and working!");
    console.log(`Response: ${JSON.stringify(response.content)}`);
    console.log("\n✅ Your API key has quota available and is working correctly.");
    
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorStatus = error?.status || error?.statusCode || error?.response?.status;
    
    console.error("\n❌ API Key test failed!");
    console.error(`Error: ${errorMessage}`);
    console.error(`Status: ${errorStatus || "N/A"}`);
    
    if (errorMessage.includes("exceeded your current quota") || errorMessage.includes("check your plan and billing")) {
      console.error("\n⚠️  QUOTA/BILLING ISSUE DETECTED");
      console.error("\nThis error indicates a billing/quota problem, not a rate limit.");
      console.error("\nPlease check:");
      console.error("1. Go to https://platform.openai.com/account/billing");
      console.error("2. Verify you have available credits/quota");
      console.error("3. Check if a payment method is required");
      console.error("4. Ensure the API key belongs to the account with quota");
      console.error("5. Check if your account/organization has spending limits set");
      console.error("\nNote: If your dashboard shows 0 usage but you get this error,");
      console.error("the API key might be from a different account/project.");
    } else if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      console.error("\n⚠️  RATE LIMIT DETECTED");
      console.error("This is a temporary rate limit. Wait a few minutes and try again.");
    } else if (errorMessage.includes("Invalid API key") || errorMessage.includes("401")) {
      console.error("\n⚠️  INVALID API KEY");
      console.error("The API key is invalid or has been revoked.");
      console.error("Please check your API key at https://platform.openai.com/api-keys");
    } else {
      console.error("\n⚠️  UNKNOWN ERROR");
      console.error("Please check the error message above for details.");
    }
    
    process.exit(1);
  }
}

testApiKey();

