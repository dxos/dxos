//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { SpaceProperties } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { EID, EntityId, IdentityDid, PublicKey, SpaceId } from '@dxos/keys';
import { createBuf, fromPublicKey } from '@dxos/protocols/buf';
import { SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { AgentPresence, AgentSpace } from '#types';

const member = (key: PublicKey, role: SpaceMember_Role, did = '') =>
  createBuf(SpaceMemberSchema, { identity: { identityKey: fromPublicKey(key), did }, role });

const space = (
  tags: string[],
  members: ReturnType<typeof member>[],
  properties?: AgentSpace.Space['properties'],
): AgentSpace.Space => ({
  id: SpaceId.random(),
  tags,
  members: { get: () => members },
  isOpen: properties !== undefined,
  properties,
});

describe('AgentSpace', () => {
  const agent = PublicKey.random();
  const me = PublicKey.random();
  const other = PublicKey.random();

  test('the agent owns its space and the other members who may write to it are its admins', ({ expect }) => {
    const kai = space(
      [AppSpace.AGENT_SPACE_TAG],
      [
        member(agent, SpaceMember_Role.OWNER),
        member(me, SpaceMember_Role.ADMIN),
        member(other, SpaceMember_Role.EDITOR),
        member(PublicKey.random(), SpaceMember_Role.READER),
      ],
    );
    expect(AgentSpace.isAgentSpace(kai)).toBe(true);
    expect(AgentSpace.agentOf(kai)?.identity?.identityKey).toEqual(fromPublicKey(agent));
    expect(AgentSpace.admins(kai).map((admin) => admin.identity?.identityKey)).toEqual([
      fromPublicKey(me),
      fromPublicKey(other),
    ]);
  });

  test('an identity administers the agent spaces it may still write to', ({ expect }) => {
    const kai = space(
      [AppSpace.AGENT_SPACE_TAG],
      [
        member(agent, SpaceMember_Role.OWNER),
        member(me, SpaceMember_Role.ADMIN),
        member(other, SpaceMember_Role.READER),
      ],
    );
    const left = space(
      [AppSpace.AGENT_SPACE_TAG],
      [member(agent, SpaceMember_Role.OWNER), member(me, SpaceMember_Role.REMOVED)],
    );
    const plain = space([], [member(me, SpaceMember_Role.OWNER)]);
    expect(AgentSpace.administeredBy([kai, left, plain], me)).toEqual([kai]);
    expect(AgentSpace.administeredBy([kai, left, plain], other)).toEqual([]);
  });

  test("an agent's space records the agent's name, its identity and the URI of its home agent", ({ expect }) => {
    const did = IdentityDid.random();
    const home = EID.make({ spaceId: SpaceId.random(), entityId: EntityId.random() });
    const kai = space(
      [AppSpace.AGENT_SPACE_TAG],
      [member(agent, SpaceMember_Role.OWNER, did), member(me, SpaceMember_Role.EDITOR)],
      Obj.make(SpaceProperties, { name: 'Kai', [Obj.Meta]: { keys: [AgentPresence.homeKey(home)] } }),
    );
    // Its properties are read only once it is open.
    const scout = PublicKey.random();
    const opening = space(
      [AppSpace.AGENT_SPACE_TAG],
      [member(scout, SpaceMember_Role.OWNER, did), member(me, SpaceMember_Role.ADMIN)],
    );
    expect(AgentSpace.administeredAgents([kai, opening], me)).toEqual([
      { spaceId: kai.id, name: 'Kai', did, identityKey: agent, home },
      { spaceId: opening.id, name: undefined, did, identityKey: scout, home: undefined },
    ]);
    expect(AgentSpace.administeredAgents([kai, opening], other)).toEqual([]);
  });
});
