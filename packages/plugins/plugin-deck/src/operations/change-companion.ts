//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { getCompanionVariant } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { ChangeCompanion } from './definitions';
import { updateActiveDeck } from './helpers';
import { DeckCapabilities } from '../types';

export default ChangeCompanion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      if (input.companion === null) {
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionOpen: false }),
        );
      } else {
        const variant = getCompanionVariant(input.companion);
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, {
            companionOpen: true,
            companionVariant: variant,
          }),
        );
      }
    }),
  ),
);
