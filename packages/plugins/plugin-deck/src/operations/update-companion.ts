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

import { currentNavigation, deckNavigation, navigate } from '../capabilities/navigate';
import { closeCompanionPlank, openCompanionPlank, resolveCompanionAnchor, resolveCompanionPlank } from '../util';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateCompanion> = LayoutOperation.UpdateCompanion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
      const deck = yield* DeckCapabilities.getDeck();
      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const { workspace } = yield* currentNavigation();

      const subject = input.subject;
      if (subject === null) {
        // Closing targets the named plank: while the deck slides companions are per-plank, so the
        // close control says which plank it belongs to. Flat mode closes the deck's companion
        // outright. The selected variant is left intact so reopening restores the last tab.
        const plankId = input.anchor ?? resolveCompanionAnchor(deck.active, attention.getCurrent());
        const companionPlanks = closeCompanionPlank(deck.companionPlanks, flatten, plankId);
        yield* navigate(yield* deckNavigation({ workspace, active: deck.active, companionPlanks }));
        return;
      }

      // Resolve the plank first: a bare variant on an empty deck names none, and recording a selected
      // variant for a companion that never opened would surface it on the next unrelated open.
      const plankId = resolveCompanionPlank({
        subject,
        anchor: input.anchor,
        planks: deck.active,
        attended: attention.getCurrent(),
      });
      if (!plankId) {
        return;
      }

      // The selected variant is global view state (shared with the split point), not deck state, and
      // is set before navigating so the chain this builds carries the variant the caller asked for.
      const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
      viewState.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({
        ...prev,
        variant: Attention.getLinkedVariant(subject),
      }));

      const companionPlanks = openCompanionPlank(deck.companionPlanks, flatten, plankId);
      yield* navigate(yield* deckNavigation({ workspace, active: deck.active, companionPlanks }));
    }),
  ),
);

export default handler;
