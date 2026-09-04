//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import { DeckCapabilities } from '#types';

import { updatePlankNames } from '../layout';
import { computeActiveUpdates, expectationHolds } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof LayoutOperation.Set> = LayoutOperation.Set.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();

      if (!expectationHolds(deck.active, input.expectActive)) {
        return;
      }

      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

      const { deckUpdates, toAttend } = computeActiveUpdates({
        next: input.subject as string[],
        deck,
        attention,
        flatten,
      });
      yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
        updateActiveDeck(state, { ...deckUpdates, plankNames: updatePlankNames(deck.plankNames, deckUpdates.active) }),
      );

      if (toAttend) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: toAttend });
      }
    }),
  ),
);

export default handler;
