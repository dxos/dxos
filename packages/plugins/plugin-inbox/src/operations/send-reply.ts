//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { DraftMessage } from '@dxos/types';

import { InboxCapabilities, InboxOperation, SystemTags } from '#types';

import { MailNotSendableError } from '../errors.ts';
import { createDraftMessage, markSent, resolveMailRoute } from '../util/index.ts';

/**
 * Writes the reply as a draft threaded under the message (so it shows in the conversation whatever
 * happens next), sends it through the mailbox's provider, and flags it sent. Without a connected
 * account the draft stays in the conversation, unsent, and the operation fails with
 * {@link MailNotSendableError}.
 */
const handler: Operation.WithHandler<typeof InboxOperation.SendReply> = InboxOperation.SendReply.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, message: messageRef, body }) {
      const mailbox = yield* Database.load(mailboxRef);
      const message = yield* Database.load(messageRef);

      const draft = yield* Database.add(
        DraftMessage.make(createDraftMessage({ mode: 'reply', message, body, mailbox })),
      );
      yield* SystemTags.toggleTag(mailbox, draft, 'draft');
      // Flushed before sending, so the reply stays in the conversation (as an unsent draft) when the send fails.
      yield* Database.flush();

      const sendOperations = yield* Capability.getAll(InboxCapabilities.MailSendOperation);
      const route = yield* resolveMailRoute(mailbox, sendOperations);
      if (!route) {
        return yield* Effect.fail(
          new MailNotSendableError({
            message:
              'The reply was saved as a draft under the email but not sent: the mailbox is not connected to an email account.',
            context: { mailbox: Obj.getURI(mailbox).toString(), replyDXN: Obj.getURI(draft).toString() },
          }),
        );
      }

      const sent = yield* Operation.invoke(route.sendOperation.getOperation(), {
        message: draft,
        connection: route.connection,
      });
      // The email is out, so a failure recording it must not fail the operation and invite a second send.
      yield* Effect.gen(function* () {
        yield* markSent(mailbox, draft, sent);
        yield* Database.flush();
      }).pipe(Effect.catchCause((cause) => Effect.sync(() => log.catch(cause))));

      return { replyDXN: Obj.getURI(draft).toString(), sentMessageId: sent.id };
    }),
  ),
);

export default handler;
