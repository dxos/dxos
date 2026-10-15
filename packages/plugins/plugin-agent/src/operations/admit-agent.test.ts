//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Agent from '@dxos/assistant/Agent';
import * as Instructions from '@dxos/compute/Instructions';
import { Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { IdentityDid, PublicKey, SpaceId } from '@dxos/keys';
import { createBuf, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact, type SpaceMember, SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { MembershipPolicy, SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { AdmitAgentError, type MemberSpace, admitAgent, mayAdmitAgent } from './admit-agent.ts';
import { CREATOR_SOURCE, SPACE_SOURCE, missingJoin } from './ensure-identity.ts';

const member = (key: PublicKey, role: SpaceMember_Role, did = ''): SpaceMember =>
  createBuf(SpaceMemberSchema, { identity: { identityKey: fromPublicKey(key), did }, role });

/** A space whose admissions are recorded; `refuse` makes it reject them, as it does for a caller who is not an admin. */
const makeSpace = (
  members: SpaceMember[],
  {
    refuse = false,
    membershipPolicy = MembershipPolicy.INVITE,
  }: { refuse?: boolean; membershipPolicy?: MembershipPolicy } = {},
) => {
  const admitted: { contact: Contact; role?: SpaceMember_Role }[] = [];
  const space: MemberSpace = {
    membershipPolicy,
    members: { get: () => members },
    admitContact: async (contact, role) => {
      if (refuse) {
        throw new Error('Not an admin of the space.');
      }
      admitted.push({ contact, role });
    },
  };
  return { space, admitted };
};

describe('admitAgent', () => {
  const owner = PublicKey.random();
  const kai = PublicKey.random();

  test("admits the agent's identity as an editor, named after the agent", async ({ expect }) => {
    const { space, admitted } = makeSpace([member(owner, SpaceMember_Role.OWNER)]);
    await EffectEx.runPromise(admitAgent(space, kai, 'Kai'));
    expect(admitted).toHaveLength(1);
    expect(toPublicKey(admitted[0].contact.identityKey)?.equals(kai)).toBe(true);
    expect(admitted[0].contact.profile?.displayName).toBe('Kai');
    expect(admitted[0].role).toBe(SpaceMember_Role.EDITOR);
  });

  test('leaves a current member as it is, and admits one that was removed', async ({ expect }) => {
    const current = makeSpace([member(owner, SpaceMember_Role.OWNER), member(kai, SpaceMember_Role.EDITOR)]);
    await EffectEx.runPromise(admitAgent(current.space, kai, 'Kai'));
    expect(current.admitted).toEqual([]);

    const removed = makeSpace([member(owner, SpaceMember_Role.OWNER), member(kai, SpaceMember_Role.REMOVED)]);
    await EffectEx.runPromise(admitAgent(removed.space, kai, 'Kai'));
    expect(removed.admitted).toHaveLength(1);
  });

  test('only those the space lets admit members may admit an agent', ({ expect }) => {
    const editor = PublicKey.random();
    const admin = PublicKey.random();
    const members = [
      member(owner, SpaceMember_Role.OWNER),
      member(admin, SpaceMember_Role.ADMIN),
      member(editor, SpaceMember_Role.EDITOR),
    ];
    const shared = makeSpace(members).space;
    expect([owner, admin, editor].map((key) => mayAdmitAgent(shared, key))).toEqual([true, true, false]);
    // A locked space admits no one after its genesis, an agent no more than a person.
    const locked = makeSpace(members, { membershipPolicy: MembershipPolicy.LOCKED }).space;
    expect([owner, admin, editor].map((key) => mayAdmitAgent(locked, key))).toEqual([false, false, false]);
    expect(mayAdmitAgent(shared, PublicKey.random())).toBe(false);
  });

  test('fails with AdmitAgentError when the space refuses', async ({ expect }) => {
    const { space } = makeSpace([member(owner, SpaceMember_Role.OWNER)], { refuse: true });
    const error = await EffectEx.runPromise(Effect.flip(admitAgent(space, kai, 'Kai')));
    expect(error).toBeInstanceOf(AdmitAgentError);
  });
});

describe('missingJoin', () => {
  const creator = { did: IdentityDid.random(), identityKey: PublicKey.random() };
  const did = IdentityDid.random();
  const own = SpaceId.random();
  /** The agent as op:ensureIdentity leaves it: its DID, its creator and its own space. */
  const agent = (
    keys = [
      { source: CREATOR_SOURCE, id: creator.did },
      { source: SPACE_SOURCE, id: own },
    ],
  ) =>
    Obj.make(Agent.Agent, {
      name: 'Kai',
      did,
      instructions: Ref.make(Instructions.make({ text: '' })),
      [Obj.Meta]: { keys },
    });
  /** The space the agent lives in, which its creator owns. */
  const home = (...members: SpaceMember[]) =>
    makeSpace([member(creator.identityKey, SpaceMember_Role.OWNER), ...members]).space;
  const admitted = member(PublicKey.random(), SpaceMember_Role.EDITOR, did);
  const holds = () => true;
  const lacks = () => false;

  test('nothing when the creator holds the agent space and the agent is admitted', ({ expect }) => {
    expect(missingJoin({ agent: agent(), self: creator, hasSpace: holds, space: home(admitted) })).toBeUndefined();
  });

  test('the creator finishes whichever step failed', ({ expect }) => {
    expect(missingJoin({ agent: agent(), self: creator, hasSpace: lacks, space: home(admitted) })).toEqual({
      membership: true,
      admission: false,
    });
    expect(missingJoin({ agent: agent(), self: creator, hasSpace: holds, space: home() })).toEqual({
      membership: false,
      admission: true,
    });
    expect(missingJoin({ agent: agent(), self: creator, hasSpace: lacks, space: home() })).toEqual({
      membership: true,
      admission: true,
    });
  });

  test('only the creator of an agent with an identity, so no one else asks EDGE', ({ expect }) => {
    const other = { did: IdentityDid.random(), identityKey: PublicKey.random() };
    expect(missingJoin({ agent: agent(), self: other, hasSpace: lacks, space: home() })).toBeUndefined();
    // An agent provisioned before the creator was recorded.
    expect(missingJoin({ agent: agent([]), self: creator, hasSpace: lacks, space: home() })).toBeUndefined();
    const legacy = Obj.make(Agent.Agent, { name: 'Kai', instructions: Ref.make(Instructions.make({ text: '' })) });
    expect(missingJoin({ agent: legacy, self: creator, hasSpace: lacks, space: home() })).toBeUndefined();
  });

  test('never re-admits an agent an admin removed, nor one its creator may not admit', ({ expect }) => {
    const removed = member(PublicKey.random(), SpaceMember_Role.REMOVED, did);
    expect(missingJoin({ agent: agent(), self: creator, hasSpace: holds, space: home(removed) })).toBeUndefined();
    const asEditor = makeSpace([member(creator.identityKey, SpaceMember_Role.EDITOR)]).space;
    expect(missingJoin({ agent: agent(), self: creator, hasSpace: holds, space: asEditor })).toBeUndefined();
    const personal = makeSpace([member(creator.identityKey, SpaceMember_Role.OWNER)], {
      membershipPolicy: MembershipPolicy.LOCKED,
    }).space;
    expect(missingJoin({ agent: agent(), self: creator, hasSpace: holds, space: personal })).toBeUndefined();
  });
});
