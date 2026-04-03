//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.ScrollIntoView> = LayoutOperation.ScrollIntoView.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        scrollIntoView: input.subject,
      }));
    }),
  ),
);

export default handler;
