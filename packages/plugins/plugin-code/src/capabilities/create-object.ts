//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import * as CodeProject from '../types/CodeProject';
import * as Spec from '../types/Spec';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Spec.Spec),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Spec.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }),
        },
        {
          id: Type.getTypename(CodeProject.CodeProject),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const spec = Spec.make();
              const project = CodeProject.make({ name: props?.name, spec });
              // Add the linked Spec to the space so the Ref resolves.
              yield* Operation.invoke(SpaceOperation.AddObject, {
                object: spec,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object: project,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }),
        },
      ]),
    ];
  }),
);
