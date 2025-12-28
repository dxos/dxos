//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';

import { Capabilities, Capability, createResolver } from '@dxos/app-framework';
import { type Selection } from '@dxos/react-ui-attention';

import { AttentionAction } from '../types';

import { AttentionCapabilities } from './capabilities';

export default Capability.makeModule((context) =>
  Capability.contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: AttentionAction.Select,
      resolve: (data) => {
        const selection = context.getCapability(AttentionCapabilities.Selection);
        Match.type<Selection>().pipe(
          Match.when({ mode: 'single', id: undefined }, () => {
            selection.clearSelection(data.contextId);
          }),
          Match.when({ mode: 'single' }, (s) => {
            selection.updateSingle(data.contextId, s.id!);
          }),
          Match.when({ mode: 'multi' }, (s) => {
            selection.updateMulti(data.contextId, s.ids);
          }),
          Match.when({ mode: 'range', from: undefined, to: undefined }, () => {
            selection.clearSelection(data.contextId);
          }),
          Match.when({ mode: 'range' }, (s) => {
            selection.updateRange(data.contextId, s.from!, s.to!);
          }),
          Match.when({ mode: 'multi-range' }, (s) => {
            selection.updateMultiRange(data.contextId, s.ranges);
          }),
          Match.exhaustive,
        )(data.selection);
      },
    }),
  ]),
);
