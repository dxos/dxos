//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { COMPANION_PREFIX } from '@dxos/app-toolkit';
import { Obj, Relation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { DeckOperation } from '@dxos/plugin-deck/operations';
import { AnchoredTo, Thread } from '@dxos/types';

import { Create, Select } from './definitions';

import { ThreadCapabilities } from '../types';

export default Create.pipe(
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
      yield* Operation.invoke(DeckOperation.ChangeCompanion, {
        companion: `${COMPANION_PREFIX}comments`,
      });
    }),
  ),
);
