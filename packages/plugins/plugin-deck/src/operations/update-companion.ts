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
import { COMPANION_VIEW_STATE_CONTEXT, companionAspect, resolveCompanionAnchor } from '../util';
import { addCompanionPlank, updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateCompanion> = LayoutOperation.UpdateCompanion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      if (input.subject === null) {
        // Closing targets the named plank: companions are per-plank, so the close control says which
        // plank it belongs to. Callers that cannot know (the URL handler pruning a companion the URL no
        // longer carries) fall back to the attended plank. The selected variant is left intact so
        // reopening restores the last tab.
        const deck = yield* DeckCapabilities.getDeck();
        const attention = yield* Capability.get(AttentionCapabilities.Attention);
        const plankId = input.anchor ?? resolveCompanionAnchor(deck.active, attention.getCurrent());
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionPlanks: deck.companionPlanks.filter((id) => id !== plankId) }),
        );
      } else {
        // The selected variant is global view state (shared with the split point), not deck state.
        // Merge so a variant change preserves the persisted split sizes.
        const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
        const variant = Attention.getLinkedVariant(input.subject);
        viewState.update(companionAspect, COMPANION_VIEW_STATE_CONTEXT, (prev) => ({ ...prev, variant }));
        // A companion id is `<plank>/~<variant>`, so the plank it belongs to is the subject's parent.
        const plankId = input.subject.slice(0, input.subject.lastIndexOf('/'));
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionPlanks: addCompanionPlank(state, plankId) }),
        );
      }
    }),
  ),
);

export default handler;
