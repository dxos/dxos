//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { GoogleMail } from '../../apis';

export default defineFunction({
  key: 'dxos.org/function/inbox/google-mail-send',
  name: 'Send Gmail',
  description: 'Send emails via Gmail.',
  inputSchema: Schema.Struct({
    userId: Schema.String.pipe(Schema.optional),
    message: Message.Message,
  }),
  outputSchema: Schema.Struct({
    id: Schema.String,
    threadId: Schema.String,
  }),
  types: [Message.Message],
  handler: ({ data: { userId = 'me', message } }) =>
    Effect.gen(function* () {
      log('sending email', { userId });

      // Extract details from the message object.
      // TODO(burdon): Refine Message schema to have explicit To/Subject fields or use properties.
      // Currently assuming properties or we might need to parse body?
      // For now, let's look for them in properties or fallback to a convention.

      const to = message.properties?.to; // Assuming 'to' is stored in properties for now.
      const subject = message.properties?.subject;
      const text = message.blocks.find((b) => b._tag === 'text')?.text;

      if (!to || !text) {
        // Failure if essential fields are missing.
        return yield* Effect.fail(new Error('Missing "to" or content in message.'));
      }

      // Construct MIME message.
      const str = [
        `To: ${to}`,
        `Subject: ${subject ?? 'No Subject'}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        text,
      ].join('\n');

      const raw = Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = yield* GoogleMail.sendMessage(userId, { raw });

      log('email sent', { id: response.id });

      return {
        id: response.id,
        threadId: response.threadId,
      };
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});
