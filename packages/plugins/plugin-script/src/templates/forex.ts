//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { S, defineFunction } from 'dxos:functions';

export default defineFunction({
  key: 'dxos.org/script/forex',
  name: 'Forex',
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: S.Struct({
    from: S.String.annotations({ description: 'The source currency' }),
    to: S.String.annotations({ description: 'The target currency' }),
  }),

  handler: async ({ data: { from, to } }: any) => {
    const res = await fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`);
    const {
      data: { rates },
    } = await res.json();

    return rates[to].toString();
  },
});
