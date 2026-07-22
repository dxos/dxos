//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { ViewModel } from '@dxos/schema';

import { Map, MapAction } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.provide(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Map.Map),
      inputSchema: MapAction.CreateMap,
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = yield* Effect.promise(async () => {
            const view = props.typename
              ? (
                  await ViewModel.makeFromDatabase({
                    db: options.db,
                    typename: props.typename,
                    pivotFieldName: props.locationFieldName,
                  })
                ).view
              : undefined;
            return Map.make({ name: props.name, view });
          });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
