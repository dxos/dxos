//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { getLinkedVariant } from '@dxos/react-ui-attention';

import { DeckCapabilities } from '../types';
import { ChangeCompanion } from './definitions';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof ChangeCompanion> = ChangeCompanion.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      if (input.companion === null) {
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { companionOpen: false }),
        );
      } else {
        const variant = getLinkedVariant(input.companion);
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

export default handler;
