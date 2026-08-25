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

import { closeEntry, updatePlankNames } from '../layout';
import { computeActiveUpdates } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof LayoutOperation.Close> = LayoutOperation.Close.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

      const next = input.subject.reduce((acc, id) => closeEntry(acc, id), deck.active);
      const { deckUpdates, toAttend } = computeActiveUpdates({ next, deck, attention, flatten });
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
