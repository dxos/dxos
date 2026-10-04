//
// Copyright 2026 DXOS.org
//

import { type HaloInbox } from '@dxos/client-protocol';
import { type Space, type SpaceMember_Role } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { createBuf, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact, ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { InboxService } from '@dxos/protocols/rpc';
import { type Actor, Message, SpaceInvitationMessage } from '@dxos/types';

export type AdmitContactsResult = { admitted: string[]; failed: { key: string; error: string }[] };

/**
 * Admits sequentially so one rejected key is reported without abandoning the rest.
 * A key found in `knownContacts` is admitted with that contact's profile, so the member is named before they join.
 */
export const admitContacts = async (
  space: Pick<Space, 'admitContact'>,
  identityKeys: string[],
  role: SpaceMember_Role,
  knownContacts: Contact[] = [],
): Promise<AdmitContactsResult> => {
  const result: AdmitContactsResult = { admitted: [], failed: [] };
  for (const key of identityKeys) {
    try {
      const identityKey = PublicKey.from(key);
      const contact =
        knownContacts.find((known) => toPublicKey(known.identityKey)?.equals(identityKey)) ??
        createBuf(ContactSchema, { identityKey: fromPublicKey(identityKey) });
      await space.admitContact(contact, role);
      result.admitted.push(key);
    } catch (error) {
      result.failed.push({ key, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
};

export type SendInvitationMessagesProps = {
  sender: Actor.Actor;
  spaceKey: PublicKey;
  /** Shown to the recipient, who cannot read the space's own name until they join. */
  spaceName?: string;
  identityKeys: string[];
  role: SpaceMember_Role;
};

/**
 * Tells each admitted identity it can join, so it need not be sent the link by hand.
 * A message is a convenience on top of the admission: a failed send is logged, never thrown.
 */
export const sendInvitationMessages = async (
  inbox: Pick<HaloInbox, 'sendMessage'>,
  { sender, spaceKey, spaceName, identityKeys, role }: SendInvitationMessagesProps,
): Promise<{ sent: string[]; failed: string[] }> => {
  const payload = Message.encodeJson(
    SpaceInvitationMessage.make({ sender, spaceKey: spaceKey.toHex(), role, spaceName }),
  );
  const results = await Promise.allSettled(
    identityKeys.map((key) =>
      inbox.sendMessage({
        recipientIdentityKey: PublicKey.from(key),
        type: InboxService.INBOX_MESSAGE_TYPE,
        payload,
      }),
    ),
  );
  const sent: string[] = [];
  const failed: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      sent.push(identityKeys[index]);
    } else {
      failed.push(identityKeys[index]);
      log.warn('failed to send space invitation message', { identityKey: identityKeys[index], error: result.reason });
    }
  });
  return { sent, failed };
};
