//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { Message, Thread } from '@dxos/types';

import { AgentIdentity, CommentOperation } from '#types';

import { restoreAnchor, snapshotAnchor } from '../anchor-preservation.ts';
import { FAILED_TEXT, PENDING_TEXT } from '../util/pending.ts';

/** A turn this long without settling is treated as failed, so the thread never waits on it forever. */
const TURN_TIMEOUT = '3 minutes';

const handler: Operation.WithHandler<typeof CommentOperation.RespondToThread> = CommentOperation.RespondToThread.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ thread: threadRef, subject: subjectRef, messageId }) {
      const [runner] = yield* Capability.getAll(AppCapabilities.CommentAgentRunner);
      if (!runner) {
        return;
      }
      const thread = yield* Database.load(threadRef);
      const subject = yield* Database.load(subjectRef);
      const db = Obj.getDatabase(thread);
      const messages = yield* Effect.promise(() => Thread.loadMessages(thread));
      const message = messages.find(({ id }) => id === messageId);
      if (!db || !message) {
        log.warn('comment-thread agent: triggering message not found', { threadId: thread.id, messageId });
        return;
      }

      // A pending reply in the agent's name shows the turn has started; the real reply replaces it.
      const [identity] = yield* Capability.getAll(AgentIdentity.AgentIdentity);
      const feed = yield* Effect.promise(() => thread.feed.load());
      const pending = {
        id: Obj.ID.random(),
        created: new Date().toISOString(),
        sender: { role: 'assistant' as const, name: identity?.name, identityDid: identity?.identityDid },
      };
      const writePending = (text: string) =>
        Effect.promise(() =>
          db.appendToFeed(feed, [Obj.make(Message.Message, { ...pending, blocks: [{ _tag: 'text', text }] })]),
        );
      yield* writePending(PENDING_TEXT);

      const snapshot = yield* Effect.promise(() => snapshotAnchor(thread, subject));
      yield* runner.run({ thread, subject, message }).pipe(
        Effect.timeout(TURN_TIMEOUT),
        Effect.andThen(() =>
          Effect.promise(async () => {
            await db.removeFeedItemsByIds(feed, [pending.id]);
            if (snapshot) {
              restoreAnchor(snapshot);
            }
          }),
        ),
        // The user's message is already in the thread; a failed turn says so in place of the pending reply.
        Effect.catch((error) =>
          Effect.gen(function* () {
            log.warn('comment-thread agent failed', { threadId: thread.id, error });
            yield* writePending(FAILED_TEXT);
            yield* Operation.schedule(ObservabilityOperation.SendEvent, {
              name: 'comments.agent.failed',
              properties: {
                spaceId: db.spaceId,
                threadId: thread.id,
              },
            });
          }),
        ),
      );
    }),
  ),
);

export default handler;
