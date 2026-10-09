//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { describe, test, vi } from 'vitest';

import { RemoteCommandRejectedError } from '@dxos/compute-runtime';
import { EdgeHttpClient } from '@dxos/edge-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';
import { EdgeCallFailedError } from '@dxos/protocols';

import * as EdgeProcessControl from './EdgeProcessControl.ts';

const SPACE = SpaceId.random();

/** What `EdgeHttpClient` throws for a JSON failure body, as EDGE's process routes answer one. */
const failure = (status: number, message: string) =>
  EdgeCallFailedError.fromUnsuccessfulResponse(
    new Response(JSON.stringify({ success: false, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
    { success: false, message },
  );

const spawnDefect = async (error: unknown): Promise<unknown> => {
  const edgeClient = new EdgeHttpClient('https://edge.example.com');
  vi.spyOn(edgeClient, 'spawnProcess').mockRejectedValue(error);
  const exit = await EffectEx.runPromise(
    EdgeProcessControl.make(() => edgeClient)
      .spawn({ spaceId: SPACE, key: 'org.dxos.operation.agent.inspectBrain' })
      .pipe(Effect.exit),
  );
  return Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined;
};

describe('EdgeProcessControl', () => {
  test("a spawn EDGE refuses (an unknown process key) dies as a rejection carrying EDGE's reason", async ({
    expect,
  }) => {
    const defect = await spawnDefect(failure(400, 'Unknown process key: org.dxos.operation.agent.inspectBrain'));
    expect(RemoteCommandRejectedError.is(defect)).toBe(true);
    expect(String(defect)).toContain('Unknown process key: org.dxos.operation.agent.inspectBrain');
  });

  test('a failure EDGE may recover from is not a rejection', async ({ expect }) => {
    for (const error of [
      failure(503, 'Service unavailable.'),
      failure(429, 'Too many requests.'),
      failure(401, 'Unauthorized.'),
      EdgeCallFailedError.fromProcessingFailureCause(new TypeError('Failed to fetch')),
    ]) {
      const defect = await spawnDefect(error);
      expect(defect).toBe(error);
      expect(RemoteCommandRejectedError.is(defect)).toBe(false);
    }
  });
});
