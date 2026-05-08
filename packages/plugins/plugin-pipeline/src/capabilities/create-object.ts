//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';
import { Pipeline } from '@dxos/types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Pipeline.Pipeline.typename,
      createObject: ((props, options) =>
        Effect.gen(function* () {
          const object = Pipeline.make(props);
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            hidden: true,
            targetNodeId: options.targetNodeId,
          });
        })) satisfies CreateObject,
    });
  }),
);
