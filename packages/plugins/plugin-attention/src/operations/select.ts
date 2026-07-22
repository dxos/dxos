//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Selection } from '@dxos/react-ui-attention';

import { AttentionCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.Select> = LayoutOperation.Select.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
      Match.value(input.subject).pipe(
        Match.when({ mode: 'single', id: undefined }, () => {
          viewState.set(Selection.selectionAspect, input.contextId, { mode: 'single' });
        }),
        Match.when({ mode: 'single' }, (s) => {
          viewState.set(Selection.selectionAspect, input.contextId, { mode: 'single', id: s.id });
        }),
        Match.when({ mode: 'multi' }, (s) => {
          viewState.set(Selection.selectionAspect, input.contextId, { mode: 'multi', ids: [...s.ids] });
        }),
        Match.when({ mode: 'range', from: undefined, to: undefined }, () => {
          viewState.set(Selection.selectionAspect, input.contextId, { mode: 'range' });
        }),
        Match.when({ mode: 'range' }, (s) => {
          viewState.set(Selection.selectionAspect, input.contextId, { mode: 'range', from: s.from, to: s.to });
        }),
        Match.when({ mode: 'multi-range' }, (s) => {
          viewState.set(Selection.selectionAspect, input.contextId, { mode: 'multi-range', ranges: [...s.ranges] });
        }),
        Match.exhaustive,
      );
    }),
  ),
);

export default handler;
