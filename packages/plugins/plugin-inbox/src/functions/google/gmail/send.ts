//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import * as Mailbox from '../../../types/Mailbox';
import { GoogleMail } from '../../apis';
import { GoogleCredentials } from '../../services/google-credentials';

export default defineFunction({
  key: 'dxos.org/function/inbox/google-mail-send',
  name: 'Send Gmail',
  description: 'Send emails via Gmail.',
  inputSchema: Schema.Struct({
    userId: Schema.String.pipe(Schema.optional),
    // TODO(dmaretskyi): This should be a ref s we can send a message from database.
    message: Message.Message,
    mailbox: Type.Ref(Mailbox.Mailbox).pipe(
      Schema.annotations({ description: 'Optional mailbox to send from. Uses mailbox credentials if provided.' }),
      Schema.optional,
    ),
  }),
  outputSchema: Schema.Struct({
    id: Schema.String,
    threadId: Schema.String,
  }),
  types: [Message.Message, Mailbox.Mailbox],
  handler: ({ data: { userId = 'me', message, mailbox: mailboxRef } }) =>
    Effect.gen(function* () {
      log('sending email', { userId, mailbox: mailboxRef?.dxn.toString() });

      // Extract details from the message object.
      // TODO(burdon): Refine Message schema to have explicit To/Subject fields or use properties.
      // Currently assuming properties or we might need to parse body?
      // For now, let's look for them in properties or fallback to a convention.

      const to = message.properties?.to; // Assuming 'to' is stored in properties for now.
      const subject = message.properties?.subject;
      const cc = message.properties?.cc;
      const bcc = message.properties?.bcc;
      const inReplyTo = message.properties?.inReplyTo;
      const references = message.properties?.references;
      const threadId = message.properties?.threadId;
      const text = message.blocks.find((b) => b._tag === 'text')?.text;

      if (!to || !text) {
        // Failure if essential fields are missing.
        return yield* Effect.fail(new Error('Missing "to" or content in message.'));
      }

      // Construct MIME message.
      const headers = [
        `To: ${to}`,
        `Subject: ${subject ?? 'No Subject'}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        ...(bcc ? [`Bcc: ${bcc}`] : []),
        ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
        ...(references ? [`References: ${references}`] : []),
        'Content-Type: text/plain; charset=utf-8',
      ];
      const str = [...headers, '', text].join('\n');

      const raw = Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = yield* GoogleMail.sendMessage(userId, { raw, ...(threadId && { threadId }) });

      log('email sent', { id: response.id });

      return {
        id: response.id,
        threadId: response.threadId,
      };
    }).pipe(
      Effect.provide(FetchHttpClient.layer),
      // Use mailbox credentials if provided, otherwise fall back to database credentials.
      Effect.provide(mailboxRef ? GoogleCredentials.fromMailboxRef(mailboxRef) : GoogleCredentials.default),
    ),
});
