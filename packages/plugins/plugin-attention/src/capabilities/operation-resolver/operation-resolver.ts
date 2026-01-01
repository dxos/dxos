//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { type Selection } from '@dxos/react-ui-attention';

import { AttentionCapabilities, AttentionOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: AttentionOperation.Select,
        handler: (input) =>
          Effect.sync(() => {
            const selection = context.getCapability(AttentionCapabilities.Selection);
            Match.type<Selection>().pipe(
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
            )(input.selection);
          }),
      }),
    ]),
  ),
);
