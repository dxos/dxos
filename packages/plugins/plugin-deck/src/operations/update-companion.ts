//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';

import { CompanionViewState, DeckCapabilities } from '#types';

import { closeCompanionPlank, openCompanionPlank, resolveCompanionAnchor, resolveCompanionPlank } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateCompanion> = LayoutOperation.UpdateCompanion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

      if (input.subject === null) {
        // Closing targets the named plank: while the deck slides companions are per-plank, so the close
        // control says which plank it belongs to. Callers that cannot know (the URL handler pruning a
        // companion the URL no longer carries) fall back to the attended plank. Flat mode ignores the
        // plank and closes the deck's companion outright. The selected variant is left intact so
        // reopening restores the last tab.
        const deck = yield* DeckCapabilities.getDeck();
        const attention = yield* Capability.get(AttentionCapabilities.Attention);
        const plankId = input.anchor ?? resolveCompanionAnchor(deck.active, attention.getCurrent());
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionPlanks: closeCompanionPlank(deck.companionPlanks, flatten, plankId) }),
        );
      } else {
        // Resolve the plank first: a bare variant on an empty deck names none, and recording a selected
        // variant for a companion that never opened would surface it on the next unrelated open.
        const deck = yield* DeckCapabilities.getDeck();
        const attention = yield* Capability.get(AttentionCapabilities.Attention);
        const plankId = resolveCompanionPlank({
          subject: input.subject,
          anchor: input.anchor,
          planks: deck.active,
          attended: attention.getCurrent(),
        });
        if (!plankId) {
          return;
        }

        // The selected variant is global view state (shared with the split point), not deck state.
        // Merge so a variant change preserves the persisted split sizes.
        const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
        const variant = Attention.getLinkedVariant(input.subject);
        viewState.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({ ...prev, variant }));

        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, {
            companionPlanks: openCompanionPlank(state.decks[state.activeDeck]?.companionPlanks ?? [], flatten, plankId),
          }),
        );
      }
    }),
  ),
);

export default handler;
