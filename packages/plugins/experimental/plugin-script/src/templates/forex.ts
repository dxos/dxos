//
// Copyright 2024 DXOS.org
//

// @ts-ignore
import { defineFunction, S } from 'dxos:functions';

/**
 * Returns the exchange rate between two currencies.
 */
export default defineFunction({
  inputSchema: S.Struct({
    args: S.Tuple(
      S.String.annotations({ description: 'The source currency' }),
      S.String.annotations({ description: 'The target currency' }),
    ),
  }),
  handler: async ({
    event: {
      data: { request },
    },
  }: any) => {
    const { args: [from = 'EUR', to = 'USD'] = [] } = await request.json();

    const res = await fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`);
    const {
      data: { rates },
    } = await res.json();

    return new Response(rates[to].toString());
  },
});
