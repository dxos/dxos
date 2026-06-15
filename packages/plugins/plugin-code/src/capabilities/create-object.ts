//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { CodeProject, Spec } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Spec.Spec),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Spec.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(CodeProject.CodeProject),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const spec = Spec.make();
            const project = CodeProject.make({ name: props?.name, spec });
            // Add the linked Spec to the space so the Ref resolves.
            yield* Operation.invoke(SpaceOperation.AddObject, {
              object: spec,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object: project,
              target: options.target,
              hidden: false,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
