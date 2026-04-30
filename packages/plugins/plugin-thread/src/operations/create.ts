//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Relation } from '@dxos/echo';
import { Operation } from '@dxos/compute';
import { linkedSegment } from '@dxos/react-ui-attention';
import { AnchoredTo, Thread } from '@dxos/types';

import { ThreadCapabilities } from '../types';
import { Create, Select } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, anchor: _anchor, subject }) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(ThreadCapabilities.State);
      const subjectId = Obj.getDXN(subject).toString();
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

      yield* Operation.invoke(Select, { current: Obj.getDXN(thread).toString() });
      yield* Operation.invoke(LayoutOperation.UpdateCompanion, {
        subject: linkedSegment('comments'),
      });
    }),
  ),
);

export default handler;
