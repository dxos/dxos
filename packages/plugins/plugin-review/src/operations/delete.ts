//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { batchEvents } from '@dxos/echo/internal';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import { AnchoredTo, Thread } from '@dxos/types';

import * as CommentCapabilities from '../types/CommentCapabilities';
import * as CommentOperation from '../types/CommentOperation';

const handler: Operation.WithHandler<typeof CommentOperation.Delete> = CommentOperation.Delete.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, anchor, thread: threadProp }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(CommentCapabilities.State);
      const thread = threadProp ?? (Relation.getSource(anchor) as Thread.Thread);
      const subjectId = Obj.getURI(subject);
      const state = registry.get(stateAtom);
      const draft = state.drafts[subjectId];
      if (draft) {
        const index = draft.findIndex((a: { id: string }) => a.id === anchor.id);
        if (index !== -1) {
          registry.set(stateAtom, {
            ...state,
            drafts: {
              ...state.drafts,
              [subjectId]: state.drafts[subjectId]?.filter((_, draftIndex) => draftIndex !== index),
            },
          });
          // Dropping the entry above consumes the draft's claim, which makes a concurrent
          // `add-message` roll its persist back. That comment was submitted, so it still deserves an
          // undo entry; a draft that was never submitted has nothing to restore. `add-message` marks
          // the transition by setting `status` before it persists.
          return thread.status === 'active' ? { thread, anchor } : {};
        }
      }

      const db = Obj.getDatabase(thread);
      if (!db) {
        return {};
      }

      // Resolve the anchor from the database rather than trusting the one passed in. `add-message`
      // persists a submitted draft as a *new* relation, so until the anchors query re-emits, the
      // rendered thread still carries the draft object — and by then the draft's claim is consumed,
      // so the branch above misses it. Removing that stale object threw `Invalid argument \`obj\``
      // (`remove` asserts `isEchoObject`), which aborted this batch before the thread was removed and
      // left the thread and its inline mark on screen with nothing left to notify the editor.
      // Querying by source thread finds whichever relation is actually persisted, so the caller's
      // reference no longer has to be the current one.
      const anchors = yield* Effect.promise(() =>
        db.query(Query.select(Filter.id(subject.id)).targetOf(AnchoredTo.AnchoredTo)).run(),
      );
      const persisted = anchors.filter((candidate: AnchoredTo.AnchoredTo) => {
        try {
          return Relation.getSource(candidate).id === thread.id;
        } catch {
          return false;
        }
      });

      // Batch every removal so a single reactive notification fires — prevents an intermediate
      // render where anchor is removed but thread still exists (mirrors the batchEvents pattern in restore.ts).
      batchEvents(() => {
        persisted.forEach((candidate) => db.remove(candidate));
        db.remove(thread);
      });

      // Undo re-adds exactly what came out, so report the relation that was removed rather than the
      // one the caller held; `restore` adding a stale draft alongside the real one is what produced a
      // duplicate mark on undo.
      const removed = persisted[0] ?? anchor;

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'comments.delete',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
        },
      });

      return { thread, anchor: removed };
    }),
  ),
);

export default handler;
