//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Artifact, Lightbox } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Artifact.Artifact),
        createObject: (_props, options) =>
          Effect.gen(function* () {
            const object = Artifact.make();
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Lightbox.Lightbox),
        createObject: (_props, options) =>
          Effect.gen(function* () {
            const object = Lightbox.make();
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
