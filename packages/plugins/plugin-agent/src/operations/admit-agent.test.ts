//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import { PublicKey } from '@dxos/keys';
import { createBuf, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact, type SpaceMember, SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { MembershipPolicy, SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { AdmitAgentError, type MemberSpace, admitAgent, mayAdmitAgent } from './admit-agent.ts';

const member = (key: PublicKey, role: SpaceMember_Role): SpaceMember =>
  createBuf(SpaceMemberSchema, { identity: { identityKey: fromPublicKey(key) }, role });

/** A space whose admissions are recorded; `refuse` makes it reject them, as it does for a caller who is not an admin. */
const makeSpace = (
  members: SpaceMember[],
  {
    refuse = false,
    membershipPolicy = MembershipPolicy.INVITE,
  }: { refuse?: boolean; membershipPolicy?: MembershipPolicy } = {},
) => {
  const admitted: { contact: Contact; role?: SpaceMember_Role; agent?: boolean }[] = [];
  const space: MemberSpace = {
    membershipPolicy,
    members: { get: () => members },
    admitContact: async (contact, role, options) => {
      if (refuse) {
        throw new Error('Not an admin of the space.');
      }
      admitted.push({ contact, role, agent: options?.agent });
    },
  };
  return { space, admitted };
};

describe('admitAgent', () => {
  const owner = PublicKey.random();
  const kai = PublicKey.random();

  test("admits the agent's identity as an editor, named after the agent and marked as one", async ({ expect }) => {
    const { space, admitted } = makeSpace([member(owner, SpaceMember_Role.OWNER)]);
    await EffectEx.runPromise(admitAgent(space, kai, 'Kai'));
    expect(admitted).toHaveLength(1);
    expect(toPublicKey(admitted[0].contact.identityKey)?.equals(kai)).toBe(true);
    expect(admitted[0].contact.profile?.displayName).toBe('Kai');
    expect(admitted[0].role).toBe(SpaceMember_Role.EDITOR);
    // The marker a locked space's owner admits it by.
    expect(admitted[0].agent).toBe(true);
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
    // A locked space takes no members after its genesis but an agent its owner admits.
    const locked = makeSpace(members, { membershipPolicy: MembershipPolicy.LOCKED }).space;
    expect([owner, admin, editor].map((key) => mayAdmitAgent(locked, key))).toEqual([true, false, false]);
    expect(mayAdmitAgent(shared, PublicKey.random())).toBe(false);
  });

  test('fails with AdmitAgentError when the space refuses', async ({ expect }) => {
    const { space } = makeSpace([member(owner, SpaceMember_Role.OWNER)], { refuse: true });
    const error = await EffectEx.runPromise(Effect.flip(admitAgent(space, kai, 'Kai')));
    expect(error).toBeInstanceOf(AdmitAgentError);
  });
});
