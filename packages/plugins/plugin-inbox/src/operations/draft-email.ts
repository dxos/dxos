//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Message } from '@dxos/types';

import { DraftEmail } from './definitions';

export default DraftEmail.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject, to, body, replyTo }) {
      const replyToMessage = !replyTo ? undefined : yield* Database.load(replyTo);
      const message = yield* Database.add(
        Obj.make(Message.Message, {
          [Obj.Meta]: {
            tags: ['org.dxos.plugin-inbox.draft'],
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
  ),
);
