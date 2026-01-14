//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Capability, Common } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { AttentionCapabilities, AttentionOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const selection = yield* Capability.get(AttentionCapabilities.Selection);

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: AttentionOperation.Select,
        handler: (input) =>
          Effect.sync(() => {
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
      }),
    ]);
  }),
);
