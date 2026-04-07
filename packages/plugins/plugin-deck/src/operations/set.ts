//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention/types';

import { updateActiveDeck } from './helpers';
import { DeckCapabilities } from '../types';
import { computeActiveUpdates } from '../util';

const handler: Operation.WithHandler<typeof LayoutOperation.Set> = LayoutOperation.Set.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const deck = yield* DeckCapabilities.getDeck();
      const attention = yield* Capability.get(AttentionCapabilities.Attention);

      const { deckUpdates, toAttend } = computeActiveUpdates({
        next: input.subject as string[],
        deck,
        attention,
      });
      yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));

      if (toAttend) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: toAttend });
      }
    }),
  ),
);

export default handler;
