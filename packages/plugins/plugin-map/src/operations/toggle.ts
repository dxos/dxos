//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { MapCapabilities } from '../types';
import { Toggle } from './definitions';

const handler: Operation.WithHandler<typeof Toggle> = Toggle.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Capabilities.updateAtomValue(MapCapabilities.State, (state) => ({
        ...state,
        type: state.type === 'globe' ? ('map' as const) : ('globe' as const),
      }));
    }),
  ),
);

export default handler;
