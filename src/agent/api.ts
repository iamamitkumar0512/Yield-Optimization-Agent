/**
 * Token information API service
 * Integrates with CoinGecko API to fetch token metadata
 */

import Coingecko from '@coingecko/coingecko-typescript';
import { TokenInfo } from './types';
import { Logger } from '../common/logger';
import { getChainById, getChainByName, SUPPORTED_CHAINS } from '../common/types';
import { isAddress } from 'viem';
import { retryWithBackoff } from '../common/utils';

const logger = new Logger('TokenInfoAPI');

// Initialize CoinGecko client
const coingeckoClient = new Coingecko({
  proAPIKey: process.env.COINGECKO_API_KEY,
  environment: process.env.COINGECKO_API_KEY ? 'pro' : 'demo',
  timeout: 10000,
  maxRetries: 3,
});

/**
 * Search for tokens by name or symbol
 */
export async function searchToken(query: string): Promise<TokenInfo[]> {
  try {
    logger.info(`Searching for token: ${query}`);

    const searchResults = await retryWithBackoff(async () => {
      return await coingeckoClient.search.get({ query });
    });

    if (!searchResults.coins || searchResults.coins.length === 0) {
      logger.warn(`No tokens found for query: ${query}`);
      return [];
    }

    // Get detailed info for top results (limit to 10)
    const topResults = searchResults.coins.slice(0, 10);
    const tokenInfos: TokenInfo[] = [];

    for (const coin of topResults) {
      try {
        const coinData = await retryWithBackoff(async () => {
          return await coingeckoClient.coins.id.get({ id: coin.id });
        });

        // Find token on supported chains
        const supportedChainEntries = Object.entries(coinData.platforms || {}).filter(
          ([platform, address]) => {
            if (!address) return false;
            const chain = getChainByName(platform);
            return chain !== undefined;
          },
        );

        if (supportedChainEntries.length > 0) {
          // Use first supported chain as primary
          const [platform, address] = supportedChainEntries[0];
          const chain = getChainByName(platform);

          if (chain && address) {
            const marketData = coinData.market_data;

            tokenInfos.push({
              name: coinData.name,
              symbol: coinData.symbol.toUpperCase(),
              address: address as string,
              chain: chain.name,
              chainId: chain.id,
              marketCap: marketData?.market_cap?.usd,
              price: marketData?.current_price?.usd,
              decimals: coinData.detail_platforms?.[platform]?.decimal_place || 18,
              logoURI: coinData.image?.large,
              description: coinData.description?.en?.substring(0, 500), // Limit description length
              priceChange24h: marketData?.price_change_percentage_24h,
              volume24h: marketData?.total_volume?.usd,
              coingeckoId: coinData.id,
              verified: true, // CoinGecko listed tokens are considered verified
              allChains: supportedChainEntries.map(([p, addr]) => {
                const c = getChainByName(p);
                return {
                  chainId: c?.id || 0,
                  chainName: c?.name || p,
                  address: addr as string,
                };
              }),
            });
          }
        }
      } catch (error) {
        logger.warn(`Failed to fetch details for coin ${coin.id}:`, error);
        // Continue with next coin
      }
    }

    logger.info(`Found ${tokenInfos.length} tokens for query: ${query}`);
    return tokenInfos;
  } catch (error) {
    logger.error(`Error searching for token ${query}:`, error);
    throw new Error(`Failed to search for token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get token info by contract address and chain
 */
export async function getTokenByAddress(
  address: string,
  chainId: number,
): Promise<TokenInfo | null> {
  try {
    logger.info(`Fetching token info for address ${address} on chain ${chainId}`);

    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // CoinGecko uses different platform IDs
    const platformMap: Record<string, string> = {
      'ethereum': 'ethereum',
      'arbitrum-one': 'arbitrum',
      'optimistic-ethereum': 'optimism',
      'polygon-pos': 'polygon',
      'base': 'base',
      'avalanche': 'avalanche',
      'binance-smart-chain': 'bsc',
    };

    const platformId = platformMap[chain.chainName] || chain.chainName;

    const tokenData = await retryWithBackoff(async () => {
      return await coingeckoClient.coins.contract.get(address, { id: platformId });
    });

    const marketData = tokenData.market_data;

    return {
      name: tokenData.name,
      symbol: tokenData.symbol.toUpperCase(),
      address: address,
      chain: chain.name,
      chainId: chainId,
      marketCap: marketData?.market_cap?.usd,
      price: marketData?.current_price?.usd,
      decimals: tokenData.detail_platforms?.[platformId]?.decimal_place || 18,
      logoURI: tokenData.image?.large,
      description: tokenData.description?.en?.substring(0, 500),
      priceChange24h: marketData?.price_change_percentage_24h,
      volume24h: marketData?.total_volume?.usd,
      coingeckoId: tokenData.id,
      verified: true,
      allChains: Object.entries(tokenData.platforms || {})
        .filter(([p, addr]) => {
          const c = getChainByName(p);
          return c !== undefined && addr;
        })
        .map(([p, addr]) => {
          const c = getChainByName(p);
          return {
            chainId: c?.id || 0,
            chainName: c?.name || p,
            address: addr as string,
          };
        }),
    };
  } catch (error) {
    logger.error(`Error fetching token by address ${address}:`, error);
    return null;
  }
}

/**
 * Get token info by name, symbol, or address
 */
export async function getTokenInfo(
  input: string,
  chainId?: number,
  chainName?: string,
): Promise<TokenInfo | TokenInfo[] | null> {
  try {
    // If input is an address, fetch directly
    if (isAddress(input)) {
      if (!chainId && !chainName) {
        throw new Error('Chain must be provided when using token address');
      }

      const resolvedChainId =
        chainId || (chainName ? getChainByName(chainName)?.id : undefined);

      if (!resolvedChainId) {
        throw new Error('Invalid chain specified');
      }

      const tokenInfo = await getTokenByAddress(input, resolvedChainId);
      return tokenInfo;
    }

    // Otherwise, search by name/symbol
    const searchResults = await searchToken(input);

    if (searchResults.length === 0) {
      return null;
    }

    // If single result, return it directly
    if (searchResults.length === 1) {
      return searchResults[0];
    }

    // Multiple results - return array for user selection
    return searchResults;
  } catch (error) {
    logger.error(`Error getting token info for ${input}:`, error);
    throw error;
  }
}

/**
 * Get token price data
 */
export async function getTokenPrice(
  coingeckoId: string,
): Promise<{ price: number; priceChange24h?: number; marketCap?: number } | null> {
  try {
    const marketData = await retryWithBackoff(async () => {
      return await coingeckoClient.coins.markets.get({
        ids: coingeckoId,
        vs_currency: 'usd',
      });
    });

    if (marketData.length === 0) {
      return null;
    }

    const data = marketData[0];
    return {
      price: data.current_price,
      priceChange24h: data.price_change_percentage_24h,
      marketCap: data.market_cap,
    };
  } catch (error) {
    logger.error(`Error fetching price for ${coingeckoId}:`, error);
    return null;
  }
}

