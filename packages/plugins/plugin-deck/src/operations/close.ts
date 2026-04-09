//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention/types';

import { closeEntry } from '../layout';
import { DeckCapabilities } from '../types';
import { computeActiveUpdates } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof LayoutOperation.Close> = LayoutOperation.Close.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const attention = yield* Capability.get(AttentionCapabilities.Attention);

      const active = deck.solo ? [deck.solo] : deck.active;
      const next = input.subject.reduce((acc, id) => closeEntry(acc, id), active);
      const { deckUpdates, toAttend } = computeActiveUpdates({ next, deck, attention });
      yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));

      if (toAttend) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: toAttend });
      }
    }),
  ),
);

export default handler;
