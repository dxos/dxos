//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, describe, test } from 'vitest';

import { EdgeApiService, EdgeRequestError, mapEdgeErrors } from '@dxos/edge-client';
import { SpaceId } from '@dxos/keys';

// Verifies the `agents`-group contract calls that `EdgeAgentManager` was migrated onto (the derived
// `@dxos/edge-protocol` client + typed errors from `@dxos/edge-client`), exercised through a mocked
// `fetch` transport. This is the seam the manager depends on: `createAgent`/`agentStatus` shapes and
// the typed-error mapping that drives its retry/give-up decision.

const BASE_URL = 'http://edge.test';

const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

describe('EdgeAgentManager agents client', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('createAgent round-trips the success envelope', async ({ expect }) => {
    globalThis.fetch = async () => jsonResponse(200, { success: true, data: { deviceKey: 'aa', feedKey: 'bb' } });
    const { client } = EdgeApiService.make({ baseUrl: BASE_URL, clientTag: 'test' });
    const { data } = await Effect.runPromise(
      mapEdgeErrors(
        client.agents.createAgent({
          payload: { identityDid: 'did:halo:test', haloSpaceId: SpaceId.random(), haloSpaceKey: 'cc' },
        }),
      ),
    );
    expect(data).toEqual({ deviceKey: 'aa', feedKey: 'bb' });
  });

  test('agentStatus round-trips an active-agent status', async ({ expect }) => {
    globalThis.fetch = async () =>
      jsonResponse(200, { success: true, data: { agent: { deviceKey: 'dd', status: 'active' } } });
    const { client } = EdgeApiService.make({ baseUrl: BASE_URL, clientTag: 'test' });
    const { data } = await Effect.runPromise(
      mapEdgeErrors(client.agents.agentStatus({ path: { identity: 'did:halo:test' } })),
    );
    expect(data.agent.status).toBe('active');
  });

  test('agentStatus maps a graceful failure to a non-retryable EdgeRequestError', async ({ expect }) => {
    globalThis.fetch = async () => jsonResponse(400, { success: false, message: 'gone', data: { type: 'not_found' } });
    const { client } = EdgeApiService.make({ baseUrl: BASE_URL, clientTag: 'test' });
    const error = await Effect.runPromise(
      mapEdgeErrors(client.agents.agentStatus({ path: { identity: 'did:halo:test' } })).pipe(Effect.flip),
    );
    expect(error).toBeInstanceOf(EdgeRequestError);
    expect((error as EdgeRequestError).isRetryable).toBe(false);
  });
});
