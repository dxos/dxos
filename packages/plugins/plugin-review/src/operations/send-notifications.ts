//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { contentCaptureAllowed } from '@dxos/observability/AiObservability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as MessengerCapabilities from '@dxos/plugin-messenger/MessengerCapabilities';
import { Message, Subscription, Thread } from '@dxos/types';

import { CommentOperation } from '#types';

/** Longest comment excerpt a notification carries. */
const EXCERPT_LENGTH = 280;

/** What a notification from an E2E space says in place of the title and the comment. */
const POINTER_TEXT = 'New comment';

const handler: Operation.WithHandler<typeof CommentOperation.SendNotifications> =
  CommentOperation.SendNotifications.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ subject: subjectRef, thread: threadRef, messageId }) {
        const [sender] = yield* Capability.getAll(MessengerCapabilities.Sender);
        if (!sender) {
          return;
        }

        const client = yield* Capability.get(ClientCapabilities.Client);
        const identity = client.halo.identity.get();
        const subject = yield* Database.load(subjectRef);
        const thread = yield* Database.load(threadRef);
        const spaceId = Obj.getDatabase(subject)?.spaceId;
        const space = spaceId ? client.spaces.get(spaceId) : undefined;
        const comment = (yield* Effect.promise(() => Thread.loadMessages(thread))).find(({ id }) => id === messageId);
        if (!identity || !space || !comment) {
          return;
        }

        // A member who left keeps their entry; the contact book may still know them through another space.
        const members = new Set(space.members.get().flatMap((member) => member.identity?.did ?? []));
        const recipients = Subscription.getSubscribers(subject, 'comments').filter(
          (did) => did !== identity.did && did !== comment.sender.identityDid && members.has(did),
        );
        if (recipients.length === 0) {
          return;
        }

        // The inbox relay reads envelopes, so it may carry only what EDGE can already read in the space.
        const plaintext = contentCaptureAllowed(space.id);
        const excerpt = Message.extractText(comment).slice(0, EXCERPT_LENGTH);
        const title = plaintext ? Obj.getLabel(subject) : undefined;
        const notification = Message.make({
          sender: { identityDid: identity.did, name: identity.profile?.displayName },
          blocks: [{ _tag: 'text', text: plaintext ? excerpt : POINTER_TEXT }],
          attachments: [{ ref: Ref.make(subject), name: title }],
          properties: { subject: title ?? POINTER_TEXT },
        });

        // One recipient's failure is theirs alone; the comment is already posted.
        yield* Effect.forEach(
          recipients,
          (did) =>
            sender
              .send(did, notification)
              .pipe(
                Effect.catch((error) =>
                  Effect.sync(() => log.warn('comment notification not sent', { recipientDid: did, error })),
                ),
              ),
          { discard: true },
        );
      }),
    ),
  );

export default handler;
