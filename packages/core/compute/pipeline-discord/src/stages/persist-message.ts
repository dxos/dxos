//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type StateError, StateStore, type Type } from '@dxos/crawler';
import { Stage } from '@dxos/pipeline';

import { MessageStore, type StoredMessage } from '../stores';

const toStored = (target: Type.Target, message: Type.Message): StoredMessage => ({
  id: message.id,
  targetId: target.id,
  authorId: message.author.id,
  ...((message.author.displayName ?? message.author.username)
    ? { authorLabel: message.author.displayName ?? message.author.username }
    : {}),
  text: message.text,
  ...(message.createdAt ? { createdAt: message.createdAt } : {}),
  ...(message.parentId ? { parentId: message.parentId } : {}),
  raw: JSON.stringify(message),
});

/**
 * Persist each message into the SQLite working set, and DROP messages that are already stored:
 * after a hard interrupt the durable cursor can lag what was processed (commit-after-process), so
 * a resumed crawl refetches an overlap window — dropping known ids here keeps every downstream
 * effect (agent stats, extraction, question answering) exactly-once. Non-message events pass
 * through untouched; a store failure is recorded on the target and the message is dropped (not
 * forwarded) so the commit sink cannot advance the durable cursor past an un-stored message —
 * the message is refetched and retried on the next resume.
 */
export const persistMessageStage = (): Stage.Stage<Type.Event, Type.Event, StateError, MessageStore | StateStore> =>
  Stage.map(
    'persist-message',
    (event: Type.Event): Effect.Effect<Type.Event | undefined, StateError, MessageStore | StateStore> =>
      event._tag !== 'Message'
        ? Effect.succeed(event)
        : Effect.gen(function* () {
            const messages = yield* MessageStore;
            if (yield* messages.has(event.message.id)) {
              // Replayed message (resume overlap) — drop before it reaches downstream stages. The
              // commit sink also never sees it, which is safe: the cursor already covers this id.
              return undefined;
            }
            yield* messages.put(toStored(event.target, event.message));
            return event;
          }).pipe(
            Effect.catchAll((error) =>
              Effect.flatMap(StateStore, (store) =>
                store
                  .setStatus(event.target.id, event.target.status, `persist-message: ${error.message}`)
                  // Drop the event: forwarding it would let the commit sink advance the cursor past
                  // a message that was never stored, silently losing it on resume.
                  .pipe(Effect.as(undefined)),
              ),
            ),
          ),
  );
