//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { Outline } from '@dxos/types';

import { Journal } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Journal.Journal),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Journal.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }),
        },
        {
          id: Type.getTypename(Outline.Outline),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Outline.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }),
        },
      ]),
    ];
  }),
);
