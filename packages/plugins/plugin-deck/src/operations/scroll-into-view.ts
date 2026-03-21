//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';

export default LayoutOperation.ScrollIntoView.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
        ...state,
        scrollIntoView: input.subject,
      }));
    }),
  ),
);
