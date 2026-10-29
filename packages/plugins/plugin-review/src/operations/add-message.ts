//
// Copyright 2025 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj, Ref, Relation } from '@dxos/echo';
import { batchEvents } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { AgentIdentity, CommentCapabilities, CommentOperation } from '#types';

import { commentAgentConfig } from '../comment-agent-config.ts';
import { shouldTriggerAgent } from '../should-trigger-agent.ts';

const handler: Operation.WithHandler<typeof CommentOperation.AddMessage> = CommentOperation.AddMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ anchor, subject, sender, text }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(CommentCapabilities.State);
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const subjectId = Obj.getURI(subject);
      const db = Obj.getDatabase(subject);
      invariant(db, 'Database not found');

      // A comment is the user's turn, so it carries the role an agent reading the thread's feed expects.
      const message = Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: { ...sender, role: sender.role ?? 'user' },
        blocks: [{ _tag: 'text', text }],
      });

      // A reply sent during the draft's save waits for it: the thread is not in the database until the save ends, and
      // saving it twice made the second save undo the first, deleting the thread. Made up front so that checking for
      // an in-flight save and claiming one share a synchronous turn.
      const done = yield* Deferred.make<void>();
      const inFlight = registry.get(stateAtom).saving?.[anchor.id];
      if (inFlight) {
        yield* Deferred.await(inFlight);
        if (!Obj.getDatabase(thread)) {
          // The save was undone by a concurrent delete, so there is no thread to reply in.
          return;
        }
      }

      const state = registry.get(stateAtom);
      const draft = state.drafts[subjectId]?.find((a: { id: string }) => a.id === anchor.id);
      // The database association, not the draft entry, is the signal: the draft is only cleared at the end of a save.
      const alreadyPersisted = Obj.getDatabase(thread) !== undefined;
      if (draft && !alreadyPersisted) {
        registry.set(stateAtom, { ...state, saving: { ...state.saving, [anchor.id]: done } });
        const saved = yield* persistThread({ db, thread, subject, subjectId, draft, anchorId: anchor.id }).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              const latest = registry.get(stateAtom);
              const saving = Object.entries(latest.saving ?? {}).filter(([anchorId]) => anchorId !== anchor.id);
              registry.set(stateAtom, { ...latest, saving: Object.fromEntries(saving) });
            }).pipe(Effect.andThen(Deferred.succeed(done, undefined))),
          ),
        );
        if (!saved) {
          return;
        }
      }

      // Appended only once the thread is saved, because a feed accepts items only when it is in a database.
      const feed = yield* Effect.promise(() => thread.feed.load());
      yield* Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(db)));

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'comments.message.add',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
          messageId: message.id,
          messageLength: text.length,
        },
      });

      // Gate the comment-thread agent. Identity is optional - if no capability
      // is contributed we simply never trigger. Schedule (not invoke) so the
      // user's message commit returns immediately and the agent runs out-of-band.
      const identities = yield* Capability.getAll(AgentIdentity.AgentIdentity);
      const identity = identities[0];
      const runners = yield* Capability.getAll(AppCapabilities.CommentAgentRunner);
      // A thread saved without an agent config (created before the setting was on) follows the current setting.
      const agent = thread.agent ?? (yield* commentAgentConfig());
      if (identity && runners.length > 0 && shouldTriggerAgent(thread, message, identity.name, agent)) {
        yield* Operation.schedule(CommentOperation.RespondToThread, {
          thread: Ref.make(thread),
          subject: Ref.make(subject),
          messageId: message.id,
        });
      }
    }),
  ),
);

export default handler;

/**
 * Saves a draft thread and its anchor, then drops the draft. Returns false when a concurrent delete consumed the
 * draft meanwhile, in which case the save is undone.
 */
const persistThread = Effect.fnUntraced(function* ({
  db,
  thread,
  subject,
  subjectId,
  draft,
  anchorId,
}: {
  db: Database.Database;
  thread: Thread.Thread;
  subject: Obj.Unknown;
  subjectId: string;
  draft: AnchoredTo.AnchoredTo;
  anchorId: string;
}) {
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(CommentCapabilities.State);
  Obj.update(thread, (thread) => {
    thread.status = 'active';
  });
  // Persist the thread + its relation BEFORE dropping the draft, so the comment is always in one
  // of the two rendered lists (query results or drafts). Removing the draft first left a frame in
  // which the persisted relation was not yet queryable and the draft was gone - the comment
  // flashed out of the companion. (The render dedupes the brief draft/persisted overlap.)
  yield* Operation.invoke(SpaceOperation.AddObject, { object: thread }, { spaceId: db.spaceId });
  const { relation } = yield* Operation.invoke(
    SpaceOperation.AddRelation,
    {
      schema: AnchoredTo.AnchoredTo,
      source: thread,
      target: subject,
      fields: { anchor: draft.anchor, branch: draft.branch },
    },
    { spaceId: db.spaceId },
  );

  // Persisting spans two awaits, during which a `Delete` for this comment can run. It sees the
  // anchor still listed as a draft, drops that entry, and returns - so without this the thread
  // persisted above survives a delete the user already issued. The draft entry doubles as the
  // claim on this comment: finding it already gone means a concurrent delete consumed it, so
  // undo the persist rather than clearing an entry that is no longer ours.
  const latest = registry.get(stateAtom);
  const claimed = latest.drafts[subjectId]?.some((a: { id: string }) => a.id === anchorId) ?? false;
  if (!claimed) {
    batchEvents(() => {
      db.remove(relation as Obj.Unknown);
      db.remove(thread);
    });
    return false;
  }

  registry.set(stateAtom, {
    ...latest,
    drafts: {
      ...latest.drafts,
      [subjectId]: latest.drafts[subjectId]?.filter((a: { id: string }) => a.id !== anchorId),
    },
  });
  yield* Operation.schedule(ObservabilityOperation.SendEvent, {
    name: 'comments.create',
    properties: {
      spaceId: db.spaceId,
      threadId: thread.id,
    },
  });
  return true;
});
