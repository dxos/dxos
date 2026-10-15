//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';
import { type PublicKey } from '@dxos/keys';
import { createBuf, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact, ContactSchema, type SpaceMember } from '@dxos/protocols/buf/dxos/client/services_pb';
import { MembershipPolicy, SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

/** What admitting an agent needs of a space; the client's `Space` has it. */
export type MemberSpace = {
  readonly membershipPolicy: MembershipPolicy;
  readonly members: { get(): SpaceMember[] };
  admitContact(contact: Contact, role?: SpaceMember_Role): Promise<void>;
};

/** The space would not admit the agent's identity: only a shared space's admins can admit members. */
export class AdmitAgentError extends BaseError.extend(
  'AdmitAgentError',
  "Only a shared space's admins can add an agent to its members.",
) {}

const roleOf = (space: Pick<MemberSpace, 'members'>, identityKey: PublicKey): SpaceMember_Role | undefined =>
  space.members.get().find((member) => toPublicKey(member.identity?.identityKey)?.equals(identityKey) ?? false)?.role;

/** Whether the identity is a current member of the space. */
export const isMember = (space: Pick<MemberSpace, 'members'>, identityKey: PublicKey): boolean => {
  const role = roleOf(space, identityKey);
  return role !== undefined && role !== SpaceMember_Role.REMOVED;
};

/**
 * Whether `self` may admit an agent's identity to the space, as the space decides it: its admins and owner. A locked
 * (personal or private) space admits no one after its genesis, an agent no more than a person.
 */
export const mayAdmitAgent = (space: Pick<MemberSpace, 'members' | 'membershipPolicy'>, self: PublicKey): boolean => {
  if (space.membershipPolicy === MembershipPolicy.LOCKED) {
    return false;
  }
  const role = roleOf(space, self);
  return role === SpaceMember_Role.OWNER || role === SpaceMember_Role.ADMIN;
};

/**
 * Admits the agent's identity to the space as an editor, named after the agent, so the space's members include it.
 * Nothing when it is a current member already.
 */
export const admitAgent = (
  space: MemberSpace,
  identityKey: PublicKey,
  name: string | undefined,
): Effect.Effect<void, AdmitAgentError> =>
  isMember(space, identityKey)
    ? Effect.void
    : Effect.tryPromise({
        try: () =>
          space.admitContact(
            createBuf(ContactSchema, {
              identityKey: fromPublicKey(identityKey),
              ...(name ? { profile: { displayName: name } } : {}),
            }),
            SpaceMember_Role.EDITOR,
          ),
        catch: (cause) => new AdmitAgentError({ cause }),
      });
