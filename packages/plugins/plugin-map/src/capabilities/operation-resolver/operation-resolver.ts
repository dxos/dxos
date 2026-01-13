//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { MapCapabilities, MapOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const mutableState = yield* Capability.get(MapCapabilities.MutableState);

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: MapOperation.Toggle,
        handler: () =>
          Effect.sync(() => {
            mutableState.type = mutableState.type === 'globe' ? 'map' : 'globe';
          }),
      }),
    ]);
  }),
);
