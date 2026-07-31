//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Attention } from '@dxos/react-ui-attention';

import { DeckCapabilities } from '../types';
import { COMPANION_VIEW_STATE_CONTEXT, companionAspect } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateCompanion> = LayoutOperation.UpdateCompanion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      if (input.subject === null) {
        // Leave the selected variant intact so reopening the companion restores the last tab.
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionOpen: false }),
        );
      } else {
        // The selected variant is global view state (shared with the split point), not deck state.
        // Merge so a variant change preserves the persisted split sizes.
        const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
        const variant = Attention.getLinkedVariant(input.subject);
        viewState.update(companionAspect, COMPANION_VIEW_STATE_CONTEXT, (prev) => ({ ...prev, variant }));
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionOpen: true }),
        );
      }
    }),
  ),
);

export default handler;
