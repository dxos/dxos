//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { Sheet } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Sheet.Sheet.typename,
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = Sheet.make(props);
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            hidden: true,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
