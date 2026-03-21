//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateSidebar> = LayoutOperation.UpdateSidebar.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      const next = input.state ?? state.sidebarState;
      if (next !== state.sidebarState) {
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => ({
          ...state,
          sidebarState: next,
        }));
      }
    }),
  ),
);

export default handler;
