//
// Copyright 2025 DXOS.org
//

// @version 0.7.5-main.b19bfc8
import { S } from '@dxos/echo-schema';
// @version 0.7.5-main.b19bfc8
import { defineFunction } from '@dxos/functions';

export default defineFunction({
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: S.Struct({
    from: S.String.annotations({ description: 'The source currency' }),
    to: S.String.annotations({ description: 'The target currency' }),
  }),

  outputSchema: S.String.annotations({ description: 'The exchange rate between the two currencies' }),

  handler: async ({
    event: {
      data: { from, to },
    },
  }) => {
    const res = await fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`);
    const {
      data: { rates },
    } = await res.json();

    return rates[to].toString();
  },
});
