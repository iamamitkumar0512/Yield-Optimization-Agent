/**
 * Common utility functions
 */

import { isAddress as viemIsAddress } from 'viem';

/**
 * Check if a string is a valid Ethereum address
 */
export function isAddress(address: string): boolean {
  return viemIsAddress(address);
}

/**
 * Format error message with context
 */
export function formatError(message: string, context?: Record<string, unknown>): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }

  const contextStr = Object.entries(context)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  return `${message} (${contextStr})`;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

