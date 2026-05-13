//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { MapCapabilities, MapOperation } from '../types';

const handler: Operation.WithHandler<typeof MapOperation.Toggle> = MapOperation.Toggle.pipe(
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
