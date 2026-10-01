//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { EntityId, SpaceId } from '@dxos/keys';

import { SandboxClient } from './SandboxClient.ts';

/**
 * Manual: runs against a deployed sandbox-service, so it is skipped unless `DX_SANDBOX_EDGE_URL` names one,
 * e.g. `DX_SANDBOX_EDGE_URL=https://preview.dxos.network/sandbox`. Assumes the env's `noAuth` is set.
 */
const EDGE_URL = process.env.DX_SANDBOX_EDGE_URL;

describe.skipIf(!EDGE_URL)('SandboxClient against a deployed EDGE', { timeout: 5 * 60_000 }, () => {
  test('a served port answers at its public URL', async ({ expect }) => {
    const client = new SandboxClient(EDGE_URL ?? '', async () => undefined);
    const spaceId = SpaceId.random();
    const sandboxId = EntityId.random();
    const marker = `hello-${sandboxId}`;

    const { body, status } = await EffectEx.runPromise(
      Effect.gen(function* () {
        // Short-lived: the test leaves nothing behind once it expires.
        yield* client.createSandbox(spaceId, sandboxId, { name: 'manual-port-test', expiresIn: 10 * 60_000 });
        const written = yield* client.exec(spaceId, sandboxId, {
          command: `mkdir -p /root/site && echo ${marker} > /root/site/index.html`,
        });
        expect(written.success).toBe(true);

        const { url } = yield* client.exposePort(spaceId, sandboxId, 8080, {
          command: 'python3 -m http.server 8080 --directory /root/site',
        });
        console.log('exposed', url);

        // No credentials: the token in the URL is all a browser would have.
        const httpClient = yield* HttpClient.HttpClient;
        const response = yield* httpClient.get(`${url}index.html`);
        return { status: response.status, body: yield* response.text };
      }).pipe(Effect.scoped, Effect.provide(FetchHttpClient.layer)),
    );

    expect(status).toBe(200);
    expect(body.trim()).toBe(marker);
  });
});
