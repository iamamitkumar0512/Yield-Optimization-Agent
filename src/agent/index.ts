/**
 * Main agent orchestration
 * Creates and runs the yield optimization agent
 */

import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import zod from 'zod';
import { AgentResponse, Logger } from '../common';
import { SystemPrompt } from './system-prompt';
import { ResponseSchema, ensureSafetyWarning } from './output-structure';
import { getYieldAgentTools } from './tools';

export interface AgentOptions {
  modelName?: string;
  temperature?: number;
  systemPrompt?: string;
  responseSchema?: zod.Schema;
  delayBetweenQuestionsMs?: number;
}

const DEFAULT_OPTIONS: Required<AgentOptions> = {
  modelName: 'gpt-4o-mini',
  temperature: 0,
  systemPrompt: SystemPrompt,
  responseSchema: ResponseSchema,
  delayBetweenQuestionsMs: 500,
};

/**
 * Create the yield optimization agent with configured LLM and tools
 */
function createAgent(options: Required<AgentOptions>) {
  const model = new ChatOpenAI({
    modelName: options.modelName,
    temperature: options.temperature,
  });

  return createReactAgent({
    llm: model,
    tools: getYieldAgentTools(),
    responseFormat: options.responseSchema as any,
  });
}

/**
 * Process a single question through the agent
 */
async function processQuestion(
  agent: ReturnType<typeof createReactAgent>,
  question: string,
  systemPrompt: string,
): Promise<AgentResponse> {
  const response = await agent.invoke({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
  });

  // Ensure safety warnings are included
  if (response && typeof response === 'object' && 'response' in response) {
    const responseData = response.response as any;
    if (responseData && typeof responseData === 'object') {
      ensureSafetyWarning(responseData);
    }
  }

  return { question, response };
}

/**
 * Run the yield optimization agent with a list of questions
 */
export async function runYieldAgent(
  questions: string[],
  options: AgentOptions = {},
): Promise<AgentResponse[]> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const logger = new Logger('YieldAgent');

  logger.info('Starting Yield Optimization Agent...');

  // Validate environment variables
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  if (!process.env.ENSO_API_KEY) {
    logger.warn('ENSO_API_KEY not set - Enso SDK features will not work');
  }

  const agent = createAgent(config);

  logger.info('Running question processing');

  const results: AgentResponse[] = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const questionNum = `[${i + 1}/${questions.length}]`;

    logger.info(`${questionNum} New question to answer: '${question}'`);

    try {
      const result = await processQuestion(agent, question, config.systemPrompt);
      logger.info('Result:', result);
      results.push(result);
      logger.info(`${questionNum} Question answered successfully`);
    } catch (error) {
      const errorMessage = (error as Error).message;
      logger.error('Agent response error:', errorMessage);
      results.push({
        question,
        response: {
          answer: `ERROR: ${errorMessage}`,
          step: 'error',
          mode: 'interactive',
          confidence: 'low',
          validationErrors: [errorMessage],
        },
      } as any);
    }

    // Add delay between questions (except for the last one)
    if (i < questions.length - 1 && config.delayBetweenQuestionsMs > 0) {
      logger.info(
        `${questionNum} Delaying for ${config.delayBetweenQuestionsMs}ms`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, config.delayBetweenQuestionsMs),
      );
    }
  }

  logger.info('Finished Agent');
  return results;
}

export * from './types';
export * from './api';
export * from './enso-service';
export * from './safety-service';
export * from './validation';
export { getYieldAgentTools } from './tools';

