//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Message } from '@dxos/types';

export default defineFunction({
  key: 'dxos.org/function/inbox/email-create',
  name: 'Create email draft',
  description: 'Creates a new email draft.',
  inputSchema: Schema.Struct({
    subject: Schema.String.annotations({
      description: 'The subject of the email.',
    }),
    // TODO(dmaretskyi): make this a reference to contact?
    to: Schema.String.annotations({
      description: 'The recipient email address.',
    }),
    body: Schema.String.annotations({
      description: 'The body of the email.',
    }),
    replyTo: Schema.optional(Type.Ref(Message.Message)).annotations({
      description: 'The message to reply to.',
    }),
  }),
  outputSchema: Schema.Struct({
    newMessageDXN: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { subject, to, body, replyTo } }) {
    const replyToMessage = !replyTo ? undefined : yield* Database.Service.load(replyTo);
    const message = yield* Database.Service.add(
      Obj.make(Message.Message, {
        [Obj.Meta]: {
          tags: ['dxos.org/plugin-inbox/draft'],
        },

        created: new Date().toISOString(),
        sender: { name: 'Me' },
        blocks: [{ _tag: 'text', text: body }],
        properties: {
          to,
          subject,
          inReplyTo: replyToMessage?.properties?.messageId,
        },
      }),
    );
    return {
      newMessageDXN: Obj.getDXN(message).toString(),
    };
  }),
});
