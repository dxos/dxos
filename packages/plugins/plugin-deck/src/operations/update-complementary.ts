//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { DeckCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateComplementary> =
  LayoutOperation.UpdateComplementary.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* (input) {
        const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        // Omitting `subject` means "leave the selection alone" — a collapse must not also forget which
        // panel was open, or reopening the sidebar lands on nothing.
        const panelChanged = input.subject !== undefined && state.complementarySidebarPanel !== input.subject;
        const next = input.subject ? 'expanded' : (input.state ?? state.complementarySidebarState);
        const stateChanged = next !== state.complementarySidebarState;

        if (panelChanged || stateChanged) {
          yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => ({
            ...state,
            complementarySidebarPanel: panelChanged ? input.subject : state.complementarySidebarPanel,
            complementarySidebarState: stateChanged ? next : state.complementarySidebarState,
          }));
        }
      }),
    ),
  );

export default handler;
