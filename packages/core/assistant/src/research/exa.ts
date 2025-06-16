//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import Exa from 'exa-js';

import { createTool, ToolResult } from '@dxos/ai';
import { log } from '@dxos/log';

import { SEARCH_RESULTS } from '../testing';

type CreateExaToolOptions = {
  apiKey: string;
};

export const createExaTool = ({ apiKey }: CreateExaToolOptions) => {
  const exa = new Exa(apiKey);

  return createTool('search', {
    name: 'web_search',
    description: 'Search the web for information',
    schema: Schema.Struct({
      query: Schema.String.annotations({ description: 'The query to search for' }),
    }),
    execute: async ({ query }) => {
      const context = await exa.searchAndContents(query, {
        type: 'auto',
        text: {
          maxCharacters: 3_000,
        },
        livecrawl: 'always',
      });

      log.info('exa search', { query, costDollars: context.costDollars });

      return ToolResult.Success(context);
    },
  });
};

export const createMockExaTool = () => {
  return createTool('search', {
    name: 'web_search',
    description: 'Search the web for information',
    schema: Schema.Struct({
      query: Schema.String.annotations({ description: 'The query to search for' }),
    }),
    execute: async ({ query }) => {
      // Find result with closest matching autoprompt using weighted Levenshtein distance
      const result = SEARCH_RESULTS.reduce(
        (closest, current) => {
          if (!current.autopromptString) {
            return closest;
          }
          if (!closest) {
            return current;
          }

          // Calculate Levenshtein distance
          const dist1 = levenshteinDistance(query, current.autopromptString);
          const dist2 = levenshteinDistance(query, closest.autopromptString || '');

          // Weight by length of the longer string to normalize
          const weight1 = dist1 / Math.max(query.length, current.autopromptString.length);
          const weight2 = dist2 / Math.max(query.length, closest.autopromptString?.length || 0);

          return weight1 < weight2 ? current : closest;
        },
        null as (typeof SEARCH_RESULTS)[0] | null,
      );

      return ToolResult.Success(result);
    },
  });
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        str1[i - 1] === str2[j - 1] ? dp[i - 1][j - 1] : Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
    }
  }

  return dp[m][n];
};
