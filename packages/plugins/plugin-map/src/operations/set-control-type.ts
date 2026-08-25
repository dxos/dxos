//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { MapCapabilities, MapOperation } from '#types';

const handler: Operation.WithHandler<typeof MapOperation.SetControlType> = MapOperation.SetControlType.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ type }) {
      yield* Capabilities.updateAtomValue(MapCapabilities.State, (state) => ({ ...state, type }));
    }),
  ),
);

export default handler;
