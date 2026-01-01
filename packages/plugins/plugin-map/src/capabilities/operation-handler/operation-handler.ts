//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { View } from '@dxos/schema';

import { Map, MapCapabilities, MapOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: MapOperation.Create,
        handler: ({ db, name, typename, locationFieldName, center, zoom, coordinates }) =>
          Effect.gen(function* () {
            const { view } = yield* Effect.promise(() =>
              View.makeFromDatabase({ db, typename, pivotFieldName: locationFieldName }),
            );
            const map = Map.make({ name, center, zoom, coordinates, view });
            return { object: map };
          }),
      }),
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

