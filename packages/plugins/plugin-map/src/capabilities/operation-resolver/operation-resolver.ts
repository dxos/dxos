//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { MapCapabilities, MapOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: MapOperation.Toggle,
        handler: () =>
          Effect.gen(function* () {
            const mutableState = yield* Capability.get(MapCapabilities.MutableState);
            mutableState.type = mutableState.type === 'globe' ? 'map' : 'globe';
          }),
      }),
    ]);
  }),
);
