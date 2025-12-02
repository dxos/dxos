//
// Copyright 2022 DXOS.org
//

// @ts-ignore
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';
import { assert, beforeAll, describe, expect, test } from 'vitest';

import { isNode, trim } from '@dxos/util';

import { bundleFunction, initializeBundler } from './bundler';

describe('Bundler', () => {
  beforeAll(async () => {
    if (!isNode()) {
      await initializeBundler({ wasmUrl });
    }
  });

  test('Basic', async () => {
    const result = await bundleFunction({
      source: `
      export default function handler () {
        return 100;
      }
    `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(Object.keys(result.assets)).toBeGreaterThan(1);
  });

  test('Import', async () => {
    const result = await bundleFunction({
      source: `
      import { Filter } from './runtime.js';

      export default function handler () {
        return Filter.typename('dxos.org/type/Example');
      }
    `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(Object.keys(result.assets)).toBeGreaterThan(1);
  });

  // TODO(dmaretskyi): Flaky on CI.
  test.skip('HTTPS Import', async () => {
    const result = await bundleFunction({
      source: `
      import { invariant } from 'https://esm.sh/@dxos/invariant';
      invariant(true);
    `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(Object.keys(result.assets)).toBeGreaterThan(1);
  });

  test('Error', async () => {
    const result = await bundleFunction({
      source: "import missing from './module'; export default () => missing();",
    });
    assert('error' in result, 'error should exist');
  });

  test('forex-effect', { timeout: 60_000 }, async () => {
    const result = await bundleFunction({
      source: trim`
        //
        // Copyright 2025 DXOS.org
        //

        import { defineFunction } from '@dxos/functions';
        import { FetchHttpClient, HttpClient, HttpClientRequest } from '@effect/platform';
        import * as Effect from 'effect/Effect';
        import * as Schedule from 'effect/Schedule';
        import * as Schema from 'effect/Schema';

        export default defineFunction({
          key: 'dxos.org/script/forex-effect',
          name: 'Forex Effect',
          description: 'Returns the exchange rate between two currencies.',

          inputSchema: Schema.Struct({
            from: Schema.String.annotations({ description: 'The source currency' }),
            to: Schema.String.annotations({ description: 'The target currency' }),
          }),

          outputSchema: Schema.String.annotations({ description: 'The exchange rate between the two currencies' }),

          handler: Effect.fnUntraced(function* ({ data: { from, to } }) {
            const res = yield* HttpClientRequest.get(\`https://free.ratesdb.com/v1/rates?from=\${from}&to=\${to}\`).pipe(
              HttpClient.execute,
              Effect.flatMap((res: any) => res.json),
              Effect.timeout('1 second'),
              Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
              Effect.scoped,
            );

            return (res as any).data.rates[to].toString();
          }, Effect.provide(FetchHttpClient.layer)),
        });
      `,
    });
    assert(!('error' in result), 'error should not exist');
    expect(Object.keys(result.assets)).toBeGreaterThan(1);
  });
});
