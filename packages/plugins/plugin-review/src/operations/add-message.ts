//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref, Relation } from '@dxos/echo';
import { batchEvents } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { AgentIdentity, CommentCapabilities, CommentOperation } from '#types';

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

      const message = Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender,
        blocks: [{ _tag: 'text', text }],
      });
      Obj.update(thread, (thread) => {
        thread.messages.push(Ref.make(message));
      });

      const state = registry.get(stateAtom);
      const draft = state.drafts[subjectId]?.find((a: { id: string }) => a.id === anchor.id);
      // The database association, not the draft entry, is the signal: a reply sent while the thread's
      // own persist is in flight reads the same not-yet-cleared draft.
      const alreadyPersisted = Obj.getDatabase(thread) !== undefined;
      if (draft && !alreadyPersisted) {
        Obj.update(thread, (thread) => {
          thread.status = 'active';
        });
        // Persist the thread + its relation BEFORE dropping the draft, so the comment is always in one
        // of the two rendered lists (query results or drafts). Removing the draft first left a frame in
        // which the persisted relation was not yet queryable and the draft was gone — the comment
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
        // anchor still listed as a draft, drops that entry, and returns — so without this the thread
        // persisted above survives a delete the user already issued. The draft entry doubles as the
        // claim on this comment: finding it already gone means a concurrent delete consumed it, so
        // undo the persist rather than clearing an entry that is no longer ours.
        const latest = registry.get(stateAtom);
        const claimed = latest.drafts[subjectId]?.some((a: { id: string }) => a.id === anchor.id) ?? false;
        if (!claimed) {
          batchEvents(() => {
            db.remove(relation as Obj.Unknown);
            db.remove(thread);
          });
          return;
        }

        registry.set(stateAtom, {
          ...latest,
          drafts: {
            ...latest.drafts,
            [subjectId]: latest.drafts[subjectId]?.filter((a: { id: string }) => a.id !== anchor.id),
          },
        });
        yield* Operation.schedule(ObservabilityOperation.SendEvent, {
          name: 'comments.create',
          properties: {
            spaceId: db.spaceId,
            threadId: thread.id,
          },
        });
      }

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'comments.message.add',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
          threadLength: thread.messages.length,
          messageId: message.id,
          messageLength: text.length,
        },
      });

      // Gate the comment-thread agent. Identity is optional — if no capability
      // is contributed we simply never trigger. Schedule (not invoke) so the
      // user's message commit returns immediately and the agent runs out-of-band.
      const identities = yield* Capability.getAll(AgentIdentity.AgentIdentity);
      const identity = identities[0];
      if (identity && shouldTriggerAgent(thread, message, identity.name)) {
        yield* Operation.schedule(CommentOperation.RespondToThread, {
          thread: Ref.make(thread),
          subject: Ref.make(subject),
        });
      }
    }),
  ),
);

export default handler;
