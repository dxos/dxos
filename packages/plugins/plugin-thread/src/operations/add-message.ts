//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { AddMessage } from './definitions';

import { ThreadCapabilities } from '../types';

export default AddMessage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ anchor, subject, sender, text }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(ThreadCapabilities.State);
      const thread = Relation.getSource(anchor) as Thread.Thread;
      const subjectId = Obj.getDXN(subject).toString();
      const db = Obj.getDatabase(subject);
      invariant(db, 'Database not found');

      const message = Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender,
        blocks: [{ _tag: 'text', text }],
      });
      Obj.change(thread, (t) => {
        t.messages.push(Ref.make(message));
      });

      const state = registry.get(stateAtom);
      const draft = state.drafts[subjectId]?.find((a: { id: string }) => a.id === anchor.id);
      if (draft) {
        Obj.change(thread, (t) => {
          t.status = 'active';
        });
        registry.set(stateAtom, {
          ...state,
          drafts: {
            ...state.drafts,
            [subjectId]: state.drafts[subjectId]?.filter((a: { id: string }) => a.id !== anchor.id),
          },
        });
        yield* Operation.invoke(SpaceOperation.AddObject, { object: thread, target: db, hidden: true });
        yield* Operation.invoke(SpaceOperation.AddRelation, {
          db,
          schema: AnchoredTo.AnchoredTo,
          source: thread,
          target: subject,
          fields: { anchor: draft.anchor },
        });
        yield* Operation.schedule(ObservabilityOperation.SendEvent, {
          name: 'threads.create',
          properties: {
            spaceId: db.spaceId,
            threadId: thread.id,
          },
        });
      }

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'threads.message.add',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
          threadLength: thread.messages.length,
          messageId: message.id,
          messageLength: text.length,
        },
      });
    }),
  ),
);
