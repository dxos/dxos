//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Halo } from '@dxos/client-protocol';
import { InboxAccountRequiredError, InboxPayloadTooLargeError } from '@dxos/protocols';
import { toPublicKey } from '@dxos/protocols/buf';
import { InboxService } from '@dxos/protocols/rpc';
import { Message } from '@dxos/types';

import { type MessengerCapabilities, MessengerError } from '#types';

/** Resolved per call, since `client.halo` is replaced when the services reconnect. */
export type SenderHalo = () => Pick<Halo, 'contacts' | 'inbox'>;

/**
 * Builds the {@link MessengerCapabilities.Sender}: the recipient DID is resolved through the contact
 * book, since a DID cannot be turned back into the identity key the relay addresses.
 */
export const makeSender = (halo: SenderHalo): MessengerCapabilities.Sender => ({
  send: (recipientDid, message) =>
    Effect.gen(function* () {
      const { contacts, inbox } = halo();
      const contact = contacts.get().find((contact) => contact.did === recipientDid);
      const recipientIdentityKey = toPublicKey(contact?.identityKey);
      if (!recipientIdentityKey) {
        return yield* Effect.fail(new MessengerError.UnknownRecipientError({ context: { recipientDid } }));
      }

      const payload = Message.encodeJson(message);
      yield* Effect.tryPromise({
        try: () => inbox.sendMessage({ recipientIdentityKey, type: InboxService.INBOX_MESSAGE_TYPE, payload }),
        catch: (error) =>
          InboxPayloadTooLargeError.is(error)
            ? new InboxPayloadTooLargeError({ cause: error })
            : InboxAccountRequiredError.is(error)
              ? new InboxAccountRequiredError({ cause: error })
              : new MessengerError.MessageSendError({ cause: error, context: { recipientDid } }),
      });
    }).pipe(Effect.withSpan('MessengerCapabilities.Sender.send')),
});
