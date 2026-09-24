//
// Copyright 2026 DXOS.org
//

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as SpaceInvitationOperation from '@dxos/app-toolkit/SpaceInvitationOperation';
import { type HaloInbox } from '@dxos/client-protocol';
import { type Contact } from '@dxos/client/halo';
import { type PublicKey } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { type InboxService } from '@dxos/protocols/rpc';

/** A verified notice whose sender is a known contact. */
export type SpaceInvitation = InboxService.Notice & { sender: Contact };

/**
 * Keeps only notices from senders in the contact book, for spaces not yet joined.
 * The SDK verifies signatures but not who may send, so a stranger's notice is dropped here.
 */
export const filterSpaceInvitations = (
  notices: readonly InboxService.Notice[],
  contacts: readonly Contact[],
  joinedSpaceKeys: readonly PublicKey[],
): SpaceInvitation[] =>
  notices.flatMap((notice) => {
    if (joinedSpaceKeys.some((key) => key.equals(notice.spaceKey))) {
      return [];
    }
    const sender = contacts.find((contact) => toPublicKey(contact.identityKey)?.equals(notice.senderIdentityKey));
    return sender ? [{ ...notice, sender }] : [];
  });

/**
 * Tracks which spaces have already been announced, so each pending space is announced once however
 * many notices name it or however often the inbox re-emits; a space is forgotten once nothing names it,
 * so a later invitation to it is announced again.
 */
export class SpaceInvitationTracker {
  readonly #announced = new Set<string>();

  /** Returns the first pending invitation for each space not announced before. */
  update(invitations: readonly SpaceInvitation[]): SpaceInvitation[] {
    const bySpace = new Map<string, SpaceInvitation>();
    for (const invitation of invitations) {
      const key = invitation.spaceKey.toHex();
      if (!bySpace.has(key)) {
        bySpace.set(key, invitation);
      }
    }
    for (const key of [...this.#announced]) {
      if (!bySpace.has(key)) {
        this.#announced.delete(key);
      }
    }
    const fresh = [...bySpace.entries()].filter(([key]) => !this.#announced.has(key));
    fresh.forEach(([key]) => this.#announced.add(key));
    return fresh.map(([, invitation]) => invitation);
  }
}

/**
 * Joins the invitation's space, then acks every pending notice for it so no device offers it again.
 * Nothing is acked when the join fails, so the invitation stays to retry; the operation reports the failure.
 */
export const joinSpaceInvitation = async (
  { invokePromise }: Pick<Capabilities.OperationInvoker, 'invokePromise'>,
  inbox: Pick<HaloInbox, 'ack' | 'notices'>,
  spaceKey: PublicKey,
): Promise<boolean> => {
  const { error } = await invokePromise(SpaceInvitationOperation.JoinBySpaceKey, { spaceKey: spaceKey.toHex() });
  if (error) {
    return false;
  }
  const ids = inbox.notices
    .get()
    .filter((notice) => notice.spaceKey.equals(spaceKey))
    .map((notice) => notice.id);
  if (ids.length > 0) {
    await inbox.ack(ids);
  }
  return true;
};
