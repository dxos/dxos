//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { PublicKey } from '@dxos/keys';
import { createBuf, fromPublicKey } from '@dxos/protocols/buf';
import { SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { AgentSpace } from '#types';

const member = (key: PublicKey, role: SpaceMember_Role, did = '') =>
  createBuf(SpaceMemberSchema, { identity: { identityKey: fromPublicKey(key), did }, role });

const space = (tags: string[], members: ReturnType<typeof member>[]): AgentSpace.Space => ({
  tags,
  members: { get: () => members },
});

describe('AgentSpace', () => {
  const agent = PublicKey.random();
  const me = PublicKey.random();
  const other = PublicKey.random();

  test('the agent owns its space and every other current member is an admin', ({ expect }) => {
    const kai = space(
      [AppSpace.AGENT_SPACE_TAG],
      [
        member(agent, SpaceMember_Role.OWNER),
        member(me, SpaceMember_Role.ADMIN),
        member(other, SpaceMember_Role.EDITOR),
      ],
    );
    expect(AgentSpace.isAgentSpace(kai)).toBe(true);
    expect(AgentSpace.agentOf(kai)?.identity?.identityKey).toEqual(fromPublicKey(agent));
    expect(AgentSpace.admins(kai).map((admin) => admin.identity?.identityKey)).toEqual([
      fromPublicKey(me),
      fromPublicKey(other),
    ]);
  });

  test('an identity administers the agent spaces it is still a member of', ({ expect }) => {
    const kai = space(
      [AppSpace.AGENT_SPACE_TAG],
      [member(agent, SpaceMember_Role.OWNER), member(me, SpaceMember_Role.ADMIN)],
    );
    const left = space(
      [AppSpace.AGENT_SPACE_TAG],
      [member(agent, SpaceMember_Role.OWNER), member(me, SpaceMember_Role.REMOVED)],
    );
    const plain = space([], [member(me, SpaceMember_Role.OWNER)]);
    expect(AgentSpace.administeredBy([kai, left, plain], me)).toEqual([kai]);
    expect(AgentSpace.administeredBy([kai, left, plain], other)).toEqual([]);
  });

  test("the agents an identity may invite elsewhere are those whose space it is in, by the agent's DID", ({
    expect,
  }) => {
    const kai = space(
      [AppSpace.AGENT_SPACE_TAG],
      [member(agent, SpaceMember_Role.OWNER, 'did:halo:kai'), member(me, SpaceMember_Role.EDITOR)],
    );
    const scout = space(
      [AppSpace.AGENT_SPACE_TAG],
      [member(PublicKey.random(), SpaceMember_Role.OWNER, 'did:halo:scout'), member(other, SpaceMember_Role.ADMIN)],
    );
    expect([...AgentSpace.administeredDids([kai, scout], me)]).toEqual(['did:halo:kai']);
    expect([...AgentSpace.administeredDids([kai, scout], other)]).toEqual(['did:halo:scout']);
  });
});
