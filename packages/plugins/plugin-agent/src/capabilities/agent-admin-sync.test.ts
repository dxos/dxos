//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import * as TestClock from 'effect/testing/TestClock';
import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type EdgeHttpClient } from '@dxos/edge-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import { IdentityDid, PublicKey, SpaceId } from '@dxos/keys';
import { EdgeCallFailedError } from '@dxos/protocols';
import { createBuf, fromPublicKey } from '@dxos/protocols/buf';
import { SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type AgentSpace } from '#types';

import { makeAdminSync, runOnWake } from './agent-admin-sync.ts';

const member = (key: PublicKey, role: SpaceMember_Role, did = '') =>
  createBuf(SpaceMemberSchema, { identity: { identityKey: fromPublicKey(key), did }, role });

type Member = ReturnType<typeof member>;

/** An agent space whose members a test changes between passes. */
const agentSpace = (initial: Member[]) => {
  let members = initial;
  const space: AgentSpace.Space = {
    id: SpaceId.random(),
    tags: [AppSpace.AGENT_SPACE_TAG],
    members: { get: () => members },
  };
  return {
    space,
    setMembers: (next: Member[]) => {
      members = next;
    },
  };
};

/**
 * EDGE as far as the sync reaches it: the agents it minted, by DID, and the calls made of it. A failure is answered as
 * EDGE's error envelope is, which its client marks not retryable whatever the status.
 */
const fakeEdge = (agents: Record<string, { defaultSpaceId: SpaceId; role?: string }>) => {
  const calls: string[] = [];
  const failures = new Map<string, number>();
  const answer = (call: string, did: string) => {
    calls.push(call);
    const status = failures.get(call);
    if (status !== undefined) {
      throw new EdgeCallFailedError({ message: `HTTP ${status}.`, status, isRetryable: false });
    }
    const agent = agents[did];
    if (!agent) {
      throw new EdgeCallFailedError({ message: 'Brain not found.', status: 404, isRetryable: false });
    }
    return agent;
  };
  const edge: Pick<EdgeHttpClient, 'getBrain' | 'addBrainAdmin'> = {
    getBrain: async (_ctx, did) => {
      const agent = answer(`GET /compute/brain/${did}`, did);
      return {
        identity: { identityDid: did, label: 'Kai', defaultSpaceId: agent.defaultSpaceId },
        role: agent.role ?? 'admin',
      };
    },
    addBrainAdmin: async (_ctx, did, identityKey) => {
      answer(`POST /compute/brain/${did}/admins ${JSON.stringify({ identityKey })}`, did);
      return { adminKeys: [] };
    },
  };
  return { client: edge, calls, failures };
};

describe('AgentAdminSync', () => {
  const did = IdentityDid.random();
  const [agent, me, editor, reader, joining] = Array.from({ length: 5 }, () => PublicKey.random());
  const run = (sync: ReturnType<typeof makeAdminSync>, spaces: AgentSpace.Space[]) =>
    EffectEx.runPromise(sync(spaces, me));

  test("adds the space's admins and editors, once, as its members change, and never takes one off", async ({
    expect,
  }) => {
    const kai = agentSpace([
      member(agent, SpaceMember_Role.OWNER, did),
      member(me, SpaceMember_Role.ADMIN),
      member(editor, SpaceMember_Role.EDITOR),
      member(reader, SpaceMember_Role.READER),
    ]);
    const edge = fakeEdge({ [did]: { defaultSpaceId: kai.space.id } });
    const sync = makeAdminSync(edge.client);

    await run(sync, [kai.space]);
    expect(edge.calls).toEqual([
      `GET /compute/brain/${did}`,
      `POST /compute/brain/${did}/admins {"identityKey":"${me.toHex()}"}`,
      `POST /compute/brain/${did}/admins {"identityKey":"${editor.toHex()}"}`,
    ]);

    // Nothing changed, so nothing is sent again; a member who joins is added, and one removed stays an admin.
    edge.calls.length = 0;
    await run(sync, [kai.space]);
    expect(edge.calls).toEqual([]);
    kai.setMembers([
      member(agent, SpaceMember_Role.OWNER, did),
      member(me, SpaceMember_Role.ADMIN),
      member(editor, SpaceMember_Role.REMOVED),
      member(reader, SpaceMember_Role.READER),
      member(joining, SpaceMember_Role.EDITOR),
    ]);
    await run(sync, [kai.space]);
    expect(edge.calls).toEqual([`POST /compute/brain/${did}/admins {"identityKey":"${joining.toHex()}"}`]);
  });

  test('a space EDGE does not name as the agent’s own, or one whose agent EDGE does not count this identity an admin of, is not synced', async ({
    expect,
  }) => {
    const claimed = agentSpace([
      member(agent, SpaceMember_Role.OWNER, did),
      member(me, SpaceMember_Role.ADMIN),
      member(editor, SpaceMember_Role.EDITOR),
    ]);
    const elsewhere = fakeEdge({ [did]: { defaultSpaceId: SpaceId.random() } });
    expect(await run(makeAdminSync(elsewhere.client), [claimed.space])).toBe(false);
    expect(elsewhere.calls).toEqual([`GET /compute/brain/${did}`]);

    const contact = fakeEdge({ [did]: { defaultSpaceId: claimed.space.id, role: 'contact' } });
    expect(await run(makeAdminSync(contact.client), [claimed.space])).toBe(false);
    expect(contact.calls).toEqual([`GET /compute/brain/${did}`]);

    // An agent EDGE does not know (404) is a refusal too, so it asks for no retry.
    const unknown = fakeEdge({});
    expect(await run(makeAdminSync(unknown.client), [claimed.space])).toBe(false);
    expect(unknown.calls).toEqual([`GET /compute/brain/${did}`]);
  });

  test('an add EDGE settles is not sent again, and one it could not take is, after asking for a retry', async ({
    expect,
  }) => {
    const kai = agentSpace([
      member(agent, SpaceMember_Role.OWNER, did),
      member(me, SpaceMember_Role.ADMIN),
      member(editor, SpaceMember_Role.EDITOR),
    ]);
    const edge = fakeEdge({ [did]: { defaultSpaceId: kai.space.id } });
    const listMe = `POST /compute/brain/${did}/admins {"identityKey":"${me.toHex()}"}`;
    const listEditor = `POST /compute/brain/${did}/admins {"identityKey":"${editor.toHex()}"}`;
    // An EDGE without the admins route answers 404, as it does a caller with no role on the agent.
    edge.failures.set(listMe, 404);
    edge.failures.set(listEditor, 503);
    const sync = makeAdminSync(edge.client);
    expect(await run(sync, [kai.space])).toBe(true);

    edge.calls.length = 0;
    edge.failures.clear();
    expect(await run(sync, [kai.space])).toBe(false);
    expect(edge.calls).toEqual([listEditor]);
  });

  test('EDGE down when a space is to be confirmed asks for a retry; a refused change does not', async ({ expect }) => {
    const kai = agentSpace([
      member(agent, SpaceMember_Role.OWNER, did),
      member(me, SpaceMember_Role.ADMIN),
      member(editor, SpaceMember_Role.EDITOR),
    ]);
    const edge = fakeEdge({ [did]: { defaultSpaceId: kai.space.id } });
    const confirmKai = `GET /compute/brain/${did}`;
    const listMe = `POST /compute/brain/${did}/admins {"identityKey":"${me.toHex()}"}`;
    const listEditor = `POST /compute/brain/${did}/admins {"identityKey":"${editor.toHex()}"}`;
    const sync = makeAdminSync(edge.client);

    edge.failures.set(confirmKai, 503);
    expect(await run(sync, [kai.space])).toBe(true);
    expect(edge.calls).toEqual([confirmKai]);

    // A refusal (403) gets the same answer however soon it is asked again, so it waits for the next pass.
    edge.calls.length = 0;
    edge.failures.clear();
    edge.failures.set(listEditor, 403);
    expect(await run(sync, [kai.space])).toBe(false);
    expect(edge.calls).toEqual([confirmKai, listMe, listEditor]);
  });

  it.effect(
    'a pass that could not reach EDGE runs again after a pause; one that could waits for a wake',
    ({ expect }) =>
      Effect.gen(function* () {
        const wake = yield* Queue.sliding<void>(1);
        const passes = yield* Queue.unbounded<number>();
        let count = 0;
        const pass = Effect.gen(function* () {
          count++;
          yield* Queue.offer(passes, count);
          return count === 1;
        });
        yield* Effect.forkScoped(runOnWake(wake, pass));

        yield* Queue.offer(wake, undefined);
        expect(yield* Queue.take(passes)).toBe(1);
        yield* TestClock.adjust('30 seconds');
        expect(yield* Queue.take(passes)).toBe(2);

        yield* TestClock.adjust('10 minutes');
        expect(yield* Queue.size(passes)).toBe(0);
        yield* Queue.offer(wake, undefined);
        expect(yield* Queue.take(passes)).toBe(3);
      }).pipe(Effect.scoped),
  );
});
