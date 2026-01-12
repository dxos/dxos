//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { MapCapabilities, MapOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: MapOperation.Toggle,
        handler: () =>
          Effect.sync(() => {
            const state = context.getCapability(MapCapabilities.MutableState);
            state.type = state.type === 'globe' ? 'map' : 'globe';
          }),
      }),
    ]),
  ),
);
