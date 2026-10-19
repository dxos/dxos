//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as EffectEx from '@dxos/effect/EffectEx';
import { IdentityDid, PublicKey, SpaceId } from '@dxos/keys';
import { EdgeCallFailedError } from '@dxos/protocols';
import { createBuf, fromPublicKey } from '@dxos/protocols/buf';
import { SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type AgentSpace } from '#types';

import { type EdgeRequest, makeAdminSync } from './agent-admin-sync.ts';

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

/** EDGE as far as the sync reaches it: the agents it minted, by DID, and the calls made of it. */
const fakeEdge = (agents: Record<string, { defaultSpaceId: SpaceId; role?: string }>) => {
  const calls: string[] = [];
  const failures = new Map<string, number>();
  const request: EdgeRequest = async (path, { method, body }) => {
    const call = `${method} ${decodeURIComponent(path)}${body ? ` ${JSON.stringify(body)}` : ''}`;
    calls.push(call);
    const status = failures.get(call);
    if (status !== undefined) {
      throw new EdgeCallFailedError({ message: `HTTP ${status}.`, status, isRetryable: false });
    }
    const [, did] = decodeURIComponent(path).match(/^\/compute\/brain\/([^/]+)/) ?? [];
    const agent = agents[did];
    if (!agent) {
      throw new EdgeCallFailedError({ message: 'Brain not found.', status: 404, isRetryable: false });
    }
    return method === 'GET'
      ? { identity: { identityDid: did, defaultSpaceId: agent.defaultSpaceId }, role: agent.role ?? 'admin' }
      : { adminKeys: [] };
  };
  return { request, calls, failures };
};

describe('AgentAdminSync', () => {
  const did = IdentityDid.random();
  const [agent, me, editor, reader, joining] = Array.from({ length: 5 }, () => PublicKey.random());
  const run = (sync: ReturnType<typeof makeAdminSync>, spaces: AgentSpace.Space[]) =>
    EffectEx.runPromise(sync(spaces, me));

  test("lists the space's admins and delists its readers, once, as its members change", async ({ expect }) => {
    const kai = agentSpace([
      member(agent, SpaceMember_Role.OWNER, did),
      member(me, SpaceMember_Role.ADMIN),
      member(editor, SpaceMember_Role.EDITOR),
      member(reader, SpaceMember_Role.READER),
    ]);
    const edge = fakeEdge({ [did]: { defaultSpaceId: kai.space.id } });
    const sync = makeAdminSync(edge.request);

    await run(sync, [kai.space]);
    expect(edge.calls).toEqual([
      `GET /compute/brain/${did}`,
      `POST /compute/brain/${did}/admins {"identityKey":"${me.toHex()}"}`,
      `POST /compute/brain/${did}/admins {"identityKey":"${editor.toHex()}"}`,
      `DELETE /compute/brain/${did}/admins/${reader.toHex()}`,
    ]);

    // Nothing changed, so nothing is told again; a member who joins is listed, and one removed is delisted.
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
    expect(edge.calls).toEqual([
      `POST /compute/brain/${did}/admins {"identityKey":"${joining.toHex()}"}`,
      `DELETE /compute/brain/${did}/admins/${editor.toHex()}`,
    ]);
  });

  test("a member the space does not show is left on EDGE's list", async ({ expect }) => {
    const kai = agentSpace([member(agent, SpaceMember_Role.OWNER, did), member(me, SpaceMember_Role.ADMIN)]);
    const edge = fakeEdge({ [did]: { defaultSpaceId: kai.space.id } });
    await run(makeAdminSync(edge.request), [kai.space]);
    expect(edge.calls.filter((call) => call.startsWith('DELETE'))).toEqual([]);
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
    await run(makeAdminSync(elsewhere.request), [claimed.space]);
    expect(elsewhere.calls).toEqual([`GET /compute/brain/${did}`]);

    const contact = fakeEdge({ [did]: { defaultSpaceId: claimed.space.id, role: 'contact' } });
    await run(makeAdminSync(contact.request), [claimed.space]);
    expect(contact.calls).toEqual([`GET /compute/brain/${did}`]);
  });

  test('a change EDGE settles is not told again, and one that failed is', async ({ expect }) => {
    const kai = agentSpace([
      member(agent, SpaceMember_Role.OWNER, did),
      member(me, SpaceMember_Role.ADMIN),
      member(editor, SpaceMember_Role.EDITOR),
      member(reader, SpaceMember_Role.REMOVED),
    ]);
    const edge = fakeEdge({ [did]: { defaultSpaceId: kai.space.id } });
    const listEditor = `POST /compute/brain/${did}/admins {"identityKey":"${editor.toHex()}"}`;
    const delistReader = `DELETE /compute/brain/${did}/admins/${reader.toHex()}`;
    edge.failures.set(listEditor, 503);
    edge.failures.set(delistReader, 409);
    const sync = makeAdminSync(edge.request);
    await run(sync, [kai.space]);

    edge.calls.length = 0;
    edge.failures.clear();
    await run(sync, [kai.space]);
    expect(edge.calls).toEqual([listEditor]);
  });
});
