//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, Relation } from '@dxos/echo';
import { linkedSegment } from '@dxos/react-ui-attention';
import { AnchoredTo, Thread } from '@dxos/types';

import { ThreadCapabilities } from '../types';
import { ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.Create> = ThreadOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, anchor: _anchor, subject }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(ThreadCapabilities.State);
      const subjectId = Obj.getId(subject);
      const thread = Thread.make({ name });
      const anchor = Relation.make(AnchoredTo.AnchoredTo, {
        [Relation.Source]: thread,
        [Relation.Target]: subject,
        anchor: _anchor,
      });

      const state = registry.get(stateAtom);
      const existingDrafts = state.drafts[subjectId];
      registry.set(stateAtom, {
        ...state,
        drafts: {
          ...state.drafts,
          [subjectId]: existingDrafts ? [...existingDrafts, anchor] : [anchor],
        },
      });

      yield* Operation.invoke(ThreadOperation.Select, { current: Obj.getId(thread) });
      yield* Operation.invoke(LayoutOperation.UpdateCompanion, {
        subject: linkedSegment('comments'),
      });
    }),
  ),
);

export default handler;
