//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client, Config } from '@dxos/client';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Bundler } from '@dxos/functions/bundler';
import { uploadWorkerFunction } from '@dxos/functions/edge';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { trim } from '@dxos/util';

describe('Functions deployment', () => {
  test('deploys function and invokes it via EDGE', { timeout: 120_000 }, async () => {
    const config = new Config({
      version: 1,
      runtime: {
        services: {
          edge: { url: 'https://edge-main.dxos.workers.dev' },
        },
      },
    });

    const client = new Client({ config });
    await client.initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();
    await space.waitUntilReady();

    const source = 'export default async ({ data }) => data;';
    // Inline echo function source.
//     const source = trim`// @ts-ignore
// import { S, defineFunction } from 'dxos:functions';
// import {
//   FetchHttpClient,
//   HttpClient,
//   HttpClientRequest,
//   // @ts-ignore
// } from 'https://esm.sh/@effect/platform@0.89.0?deps=effect@3.17.0&bundle=false';
// // @ts-ignore
// import { Effect, Schedule } from 'https://esm.sh/effect@3.17.0?bundle=false';

// export default defineFunction({
//   key: 'dxos.org/script/forex-effect',
//   name: 'Forex Effect',
//   description: 'Returns the exchange rate between two currencies.',

//   inputSchema: S.Struct({
//     from: S.String.annotations({ description: 'The source currency' }),
//     to: S.String.annotations({ description: 'The target currency' }),
//   }),

//   outputSchema: S.String.annotations({ description: 'The exchange rate between the two currencies' }),

//   handler: async ({ data: { from, to } }: any) =>
//     Effect.gen(function* () {
//       const res = yield* HttpClientRequest.get(\`https://free.ratesdb.com/v1/rates?from=${from}&to=${to}\`).pipe(
//         HttpClient.execute,
//         Effect.flatMap((res: any) => res.json),
//         Effect.timeout('1 second'),
//         Effect.retry(Schedule.exponential(1_000).pipe(Schedule.compose(Schedule.recurs(3)))),
//         Effect.scoped,
//       );

//       return res.data.rates[to].toString();
//     }).pipe(Effect.provide(FetchHttpClient.layer)),
// });
// `;

    // Bundle and upload.
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const buildResult = await bundler.bundle({ source });
    if ('error' in buildResult) {
      throw buildResult.error ?? new Error('Bundle creation failed');
    }

    const { functionId } = await uploadWorkerFunction({
      client,
      ownerPublicKey: space.key,
      version: '0.0.1',
      entryPoint: buildResult.entryPoint,
      assets: { [buildResult.entryPoint]: buildResult.asset },
      name: 'e2e-echo',
    });

    expect(functionId).toBeDefined();

    // Invoke deployed function via EDGE directly.
    const edgeClient = client.edge;
    invariant(edgeClient, 'edgeClient is required');
    edgeClient.setIdentity(createEdgeIdentity(client));

    // functionId may include a leading '/', strip it for invoke endpoint.
    const cleanedId = (functionId ?? '').replace(/^\//, '');
    const input = { msg: 'hello' };
    const result = await edgeClient.invokeFunction({ functionId: cleanedId }, input);
    log.info('>>> result', { result, functionId: cleanedId });
    expect(result).toEqual({ success: true, data: { msg: 'hello' } });

    await client.destroy();
  });
});
