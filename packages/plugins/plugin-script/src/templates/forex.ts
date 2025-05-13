//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
// @ts-ignore
import { defineFunction } from 'dxos:functions';

export default defineFunction({
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: Schema.Struct({
    from: Schema.String.annotations({ description: 'The source currency' }),
    to: Schema.String.annotations({ description: 'The target currency' }),
  }),

  handler: async ({
    event: {
      data: { from, to },
    },
  }: any) => {
    const res = await fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`);
    const {
      data: { rates },
    } = await res.json();

    return rates[to].toString();
  },
});
