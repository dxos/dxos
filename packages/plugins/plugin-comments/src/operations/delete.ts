//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { sleep } from '@dxos/async';
import { Operation } from '@dxos/compute';
import { Obj, Relation } from '@dxos/echo';
import { ObservabilityOperation } from '@dxos/plugin-observability';
import { Thread } from '@dxos/types';

import { CommentCapabilities } from '../types';
import { CommentOperation } from '../types';

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
          return {};
        }
      }

      const db = Obj.getDatabase(thread);
      if (!db) {
        return {};
      }

      // TODO(wittjosiah): Without sleep, rendering crashes at `Relation.setSource(anchor)`.
      db.remove(anchor);
      yield* Effect.promise(() => sleep(100));
      db.remove(thread);

      yield* Operation.schedule(ObservabilityOperation.SendEvent, {
        name: 'comments.delete',
        properties: {
          spaceId: db.spaceId,
          threadId: thread.id,
        },
      });

      return { thread, anchor };
    }),
  ),
);

export default handler;
