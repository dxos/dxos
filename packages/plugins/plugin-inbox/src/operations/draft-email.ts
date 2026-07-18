//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { DraftMessage } from '@dxos/types';

import { InboxOperation, SystemTags } from '../types';

const handler: Operation.WithHandler<typeof InboxOperation.DraftEmail> = InboxOperation.DraftEmail.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ subject, to, body, replyTo, mailbox: mailboxRef }) {
      const replyToMessage = !replyTo ? undefined : yield* Database.load(replyTo);
      const mailbox = yield* Database.load(mailboxRef);
      const mailboxUri = Obj.getURI(mailbox);

      const message = yield* Database.add(
        DraftMessage.make({
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

      // Tag with the canonical 'draft' system tag so the Drafts view (a plain systemTag filter, like
      // Inbox/Sent) picks it up — same mechanism every other draft-creation path uses.
      const { db } = yield* Database.Service;
      yield* Effect.promise(() => SystemTags.toggleTag(mailbox, message, db, 'draft'));

      return {
        newMessageDXN: Obj.getURI(message),
      };
    }),
  ),
);

export default handler;
