//
// Copyright 2026 DXOS.org
//

import { type HaloInbox } from '@dxos/client-protocol';
import { type Space, type SpaceMember_Role } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { InboxAccountRequiredError } from '@dxos/protocols';
import { createBuf, fromPublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact, ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { InboxService } from '@dxos/protocols/rpc';
import { type Actor, Message, SpaceInvitationMessage } from '@dxos/types';

import { type SpaceOperation } from '#types';

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

export type SendInvitationMessagesResult = {
  sent: string[];
  failed: { key: string; reason: SpaceOperation.NoticeFailureReason }[];
};

/**
 * Tells each admitted identity it can join, so it need not be sent the link by hand.
 * A message is a convenience on top of the admission: a failed send is reported, never thrown.
 */
export const sendInvitationMessages = async (
  inbox: Pick<HaloInbox, 'sendMessage'>,
  { sender, spaceKey, spaceName, identityKeys, role }: SendInvitationMessagesProps,
): Promise<SendInvitationMessagesResult> => {
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
  const outcome: SendInvitationMessagesResult = { sent: [], failed: [] };
  results.forEach((result, index) => {
    const key = identityKeys[index];
    if (result.status === 'fulfilled') {
      outcome.sent.push(key);
    } else if (InboxAccountRequiredError.is(result.reason)) {
      outcome.failed.push({ key, reason: 'account-required' });
    } else {
      outcome.failed.push({ key, reason: 'send-failed' });
      log.warn('failed to send space invitation message', { identityKey: key, error: result.reason });
    }
  });
  return outcome;
};
