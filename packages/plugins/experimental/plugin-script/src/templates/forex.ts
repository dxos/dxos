//
// Copyright 2025 DXOS.org
//

// TODO(wittjosiah): Use @dxos packages from npm.
// @ts-ignore
import { defineFunction, S } from 'dxos:functions';

export default defineFunction({
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: S.Struct({
    from: S.String.annotations({ description: 'The source currency' }),
    to: S.String.annotations({ description: 'The target currency' }),
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
