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

import { currentNavigation, navigateDeck } from '../url/index.ts';
import {
  closeCompanionPlank,
  openCompanionPlank,
  resolveCompanionAnchor,
  resolveCompanionPlank,
  updateActiveDeck,
} from '../util/index.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateCompanion> = LayoutOperation.UpdateCompanion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
      const deck = yield* DeckCapabilities.getDeck();
      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const { workspace } = yield* currentNavigation();

      const subject = input.subject;
      if (subject === null) {
        const plankId = input.anchor ?? resolveCompanionAnchor(deck.active, attention.getCurrent());
        // Written here rather than left to the projection: the URL carries no companion pair either
        // way, so the projection cannot tell this close from a deck nobody has decided on.
        const companionPlanks = closeCompanionPlank(deck.companionPlanks, flatten, plankId, deck.active);
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionPlanks }),
        );
        yield* navigateDeck({ workspace, active: deck.active, companionPlanks });
        return;
      }

      const plankId = resolveCompanionPlank({
        subject,
        anchor: input.anchor,
        planks: deck.active,
        attended: attention.getCurrent(),
      });
      if (!plankId) {
        return;
      }

      const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
      viewState.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({
        ...prev,
        variant: Attention.getLinkedVariant(subject),
      }));

      const companionPlanks = openCompanionPlank(deck.companionPlanks, flatten, plankId);
      yield* navigateDeck({ workspace, active: deck.active, companionPlanks });
    }),
  ),
);

export default handler;
