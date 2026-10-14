//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';
import { type PublicKey } from '@dxos/keys';
import { createBuf, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact, ContactSchema, type SpaceMember } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

/** What admitting an agent needs of a space; the client's `Space` has it. */
export type MemberSpace = {
  readonly members: { get(): SpaceMember[] };
  admitContact(contact: Contact, role?: SpaceMember_Role, options?: { agent?: boolean }): Promise<void>;
};

/** The space would not admit the agent's identity: only a space's admins can admit members. */
export class AdmitAgentError extends BaseError.extend(
  'AdmitAgentError',
  "Only a space's admins can add an agent to its members.",
) {}

/**
 * Admits the agent's identity to the space as an editor, named after the agent, so the space's members include it.
 * Admitted as an agent, which a locked (personal or private) space's owner may still do though the space takes no
 * other members after its genesis. Nothing when it is a current member already.
 */
export const admitAgent = (
  space: MemberSpace,
  identityKey: PublicKey,
  name: string | undefined,
): Effect.Effect<void, AdmitAgentError> =>
  space.members
    .get()
    .some(
      (member) =>
        member.role !== SpaceMember_Role.REMOVED &&
        (toPublicKey(member.identity?.identityKey)?.equals(identityKey) ?? false),
    )
    ? Effect.void
    : Effect.tryPromise({
        try: () =>
          space.admitContact(
            createBuf(ContactSchema, {
              identityKey: fromPublicKey(identityKey),
              ...(name ? { profile: { displayName: name } } : {}),
            }),
            SpaceMember_Role.EDITOR,
            { agent: true },
          ),
        catch: (cause) => new AdmitAgentError({ cause }),
      });
