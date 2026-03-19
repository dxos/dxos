//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

export default defineFunction({
  key: 'org.dxos.script.forex',
  name: 'Forex',
  description: 'Returns the exchange rate between two currencies.',

  inputSchema: Schema.Struct({
    from: Schema.String.annotations({ description: 'The source currency' }),
    to: Schema.String.annotations({ description: 'The target currency' }),
  }),

  handler: async ({ data: { from: rawFrom, to: rawTo } }) => {
    const from = rawFrom.toUpperCase();
    const to = rawTo.toUpperCase();
    const res = await fetch(`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}`);
    if (!res.ok) {
      throw new Error(`Rates API returned ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const rate = json?.data?.rates?.[to];
    if (rate == null) {
      throw new Error(`No rate found for ${from} -> ${to}`);
    }

    return rate.toString();
  },
});
