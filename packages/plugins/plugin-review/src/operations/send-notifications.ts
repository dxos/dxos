//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { contentCaptureAllowed } from '@dxos/observability/AiObservability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Attention } from '@dxos/react-ui-attention/types';
import { Message, Subscription, Thread } from '@dxos/types';

import { CommentOperation } from '#types';

const EXCERPT_LENGTH = 280;

const REDACTED_TEXT = 'New comment';

const handler: Operation.WithHandler<typeof CommentOperation.SendNotifications> =
  CommentOperation.SendNotifications.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ subject: subjectRef, thread: threadRef, messageId }) {
        const [sender] = yield* Capability.getAll(AppCapabilities.InboxSender);
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
        if (!comment) {
          log.warn('comment to notify about not found', { threadId: thread.id, messageId });
          return;
        }
        if (!identity || !space) {
          return;
        }

        const currentMembers = new Set(
          space.members
            .get()
            .filter((member) => member.role !== SpaceMember_Role.REMOVED)
            .flatMap((member) => member.identity?.did ?? []),
        );
        const recipients = Subscription.getSubscribers(subject, 'comments').filter(
          (did) => did !== identity.did && did !== comment.sender.identityDid && currentMembers.has(did),
        );
        if (recipients.length === 0) {
          return;
        }

        const edgeCanRead = contentCaptureAllowed(space.id);
        // By code point, so the cut never splits a surrogate pair.
        const excerpt = Array.from(Message.extractText(comment)).slice(0, EXCERPT_LENGTH).join('');
        const title = edgeCanRead ? Obj.getLabel(subject) : undefined;
        const notification = Message.make({
          sender: { identityDid: identity.did, name: identity.profile?.displayName },
          blocks: [{ _tag: 'text', text: edgeCanRead ? excerpt : REDACTED_TEXT }],
          attachments: [{ ref: Ref.make(subject), name: title }],
          // Opening the notification shows the subject with its comments.
          properties: { ...(title ? { subject: title } : {}), companion: Attention.linkedSegment('comments') },
        });

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
