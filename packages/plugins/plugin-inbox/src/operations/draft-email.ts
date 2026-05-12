//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { DraftMessage, InboxOperation } from '../types';

const handler: Operation.WithHandler<typeof InboxOperation.DraftEmail> = InboxOperation.DraftEmail.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject, to, body, replyTo, mailbox: mailboxRef }) {
      const replyToMessage = !replyTo ? undefined : yield* Database.load(replyTo);
      const mailbox = yield* Database.load(mailboxRef);
      const mailboxDxn = Obj.getDXN(mailbox).toString();

      const message = yield* Database.add(
        DraftMessage.make({
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
            mailbox: mailboxDxn,
          },
        }),
      );
      return {
        newMessageDXN: Obj.getDXN(message).toString(),
      };
    }),
  ),
);

export default handler;
