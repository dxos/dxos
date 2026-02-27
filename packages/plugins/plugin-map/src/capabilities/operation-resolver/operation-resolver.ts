//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { MapAction, MapCapabilities } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: MapAction.MapOperation.Toggle,
        handler: Effect.fnUntraced(function* () {
          yield* Capabilities.updateAtomValue(MapCapabilities.State, (state) => ({
            ...state,
            type: state.type === 'globe' ? ('map' as const) : ('globe' as const),
          }));
        }),
      }),
    ]);
  }),
);
