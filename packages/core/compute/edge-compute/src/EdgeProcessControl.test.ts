//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import { describe, test, vi } from 'vitest';

import { ProcessNotFoundError, RemoteCommandRejectedError } from '@dxos/compute-runtime';
import * as Process from '@dxos/compute/Process';
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

  test('a 404 for one process dies as ProcessNotFoundError; for a spawn it stays a plain rejection', async ({
    expect,
  }) => {
    const edgeClient = new EdgeHttpClient('https://edge.example.com');
    vi.spyOn(edgeClient, 'submitProcessInput').mockRejectedValue(failure(404, 'Process not found'));
    const exit = await EffectEx.runPromise(
      EdgeProcessControl.make(() => edgeClient)
        .submitInput({ spaceId: SPACE, pid: Schema.decodeUnknownSync(Process.ID)('pid-1'), input: 'hi' })
        .pipe(Effect.exit),
    );
    expect(Exit.isFailure(exit) && ProcessNotFoundError.is(Cause.squash(exit.cause))).toBe(true);

    const defect = await spawnDefect(failure(404, 'Not found'));
    expect(RemoteCommandRejectedError.is(defect)).toBe(true);
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
