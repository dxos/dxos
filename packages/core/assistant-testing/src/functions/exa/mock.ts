//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { defineFunction } from '@dxos/functions';

import { SEARCH_RESULTS } from '../../testing';

export default defineFunction({
  key: 'dxos.org/function/exa-mock',
  name: 'Exa mock',
  description: 'Search the web for information',
  inputSchema: Schema.Struct({
    query: Schema.String.annotations({
      description: 'The query to search for.',
    }),
  }),
  outputSchema: Schema.Unknown,
  handler: Effect.fnUntraced(function* ({ data: { query } }) {
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

    return result;
  }),
});

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
