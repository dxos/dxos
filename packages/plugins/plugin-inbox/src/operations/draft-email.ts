//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { DraftMessage } from '@dxos/types';

import { InboxOperation } from '../types';

const handler: Operation.WithHandler<typeof InboxOperation.DraftEmail> = InboxOperation.DraftEmail.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject, to, body, replyTo, mailbox: mailboxRef }) {
      const replyToMessage = !replyTo ? undefined : yield* Database.load(replyTo);
      const mailbox = yield* Database.load(mailboxRef);
      const mailboxUri = Obj.getURI(mailbox);

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
            mailbox: mailboxUri,
          },
        }),
      );
      return {
        newMessageDXN: Obj.getURI(message),
      };
    }),
  ),
);

export default handler;
