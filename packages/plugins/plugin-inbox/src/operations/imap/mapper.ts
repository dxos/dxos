//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Ref } from '@dxos/echo';
import { Message, Person } from '@dxos/types';

import { type ImapBody, type ImapEnvelope } from '../../services';
import { resolve, type Resolver } from '@dxos/extractor';

const formatAddress = (addr: { name?: string; address: string }): string =>
  addr.name ? `"${addr.name}" <${addr.address}>` : addr.address;

const joinAddresses = (addrs: ReadonlyArray<{ name?: string; address: string }> | undefined): string | undefined => {
  if (!addrs || addrs.length === 0) {
    return undefined;
  }
  return addrs.map(formatAddress).join(', ');
};

/**
 * Maps IMAP envelope + body to an ECHO `Message.Message`. The foreign-key
 * `source` is `imap:<host>` so different servers don't collide on UIDs.
 */
export const mapMessage = (input: {
  envelope: ImapEnvelope;
  body: ImapBody;
  host: string;
  uidValidity: number;
}): Effect.Effect<Message.Message | null, never, Resolver> =>
  Effect.gen(function* () {
    const { envelope, body, host, uidValidity } = input;
    const sender = envelope.from[0];
    if (!sender) {
      return null;
    }

    const text = body.text ?? body.html ?? '';
    if (!text) {
      return null;
    }

    const contact = yield* resolve(Person.Person, { email: sender.address });
    const senderField = {
      ...sender,
      email: sender.address,
      ...(contact ? { contact: Ref.make(contact) } : {}),
    };

    // Foreign-key id encodes uidValidity so a UIDVALIDITY change forces
    // re-import of the affected messages (rather than silent duplication).
    const foreignId = `${uidValidity}:${envelope.uid}`;

    return Obj.make(Message.Message, {
      [Obj.Meta]: {
        keys: [{ id: foreignId, source: `imap:${host}` }],
      },
      created: envelope.internalDate.toISOString(),
      sender: senderField,
      properties: {
        subject: envelope.subject,
        messageId: envelope.messageId,
        references: envelope.references?.join(' '),
        to: joinAddresses(envelope.to),
        cc: joinAddresses(envelope.cc),
        labels: envelope.flags as ReadonlyArray<string>,
      },
      blocks: [
        {
          _tag: 'text',
          text,
        },
      ],
    });
  });
