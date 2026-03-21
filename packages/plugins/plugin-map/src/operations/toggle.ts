//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { MapCapabilities } from '../types';

import { Toggle } from './definitions';

export default Toggle.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Capabilities.updateAtomValue(MapCapabilities.State, (state) => ({
        ...state,
        type: state.type === 'globe' ? ('map' as const) : ('globe' as const),
      }));
    }),
  ),
);
