//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { AttentionCapabilities } from '../types';
import { Select } from './definitions';

export default Select.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const selection = yield* Capability.get(AttentionCapabilities.Selection);
      Match.value(input.selection).pipe(
        Match.when({ mode: 'single', id: undefined }, () => {
          selection.clearSelection(input.contextId);
        }),
        Match.when({ mode: 'single' }, (s) => {
          selection.updateSingle(input.contextId, s.id!);
        }),
        Match.when({ mode: 'multi' }, (s) => {
          selection.updateMulti(input.contextId, s.ids);
        }),
        Match.when({ mode: 'range', from: undefined, to: undefined }, () => {
          selection.clearSelection(input.contextId);
        }),
        Match.when({ mode: 'range' }, (s) => {
          selection.updateRange(input.contextId, s.from!, s.to!);
        }),
        Match.when({ mode: 'multi-range' }, (s) => {
          selection.updateMultiRange(input.contextId, s.ranges);
        }),
        Match.exhaustive,
      );
    }),
  ),
);
