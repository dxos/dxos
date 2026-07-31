//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Artifact, Lightbox } from '#types';

import { getArtifactsPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Artifact.Artifact),
          createObject: (_props, options) =>
            Effect.gen(function* () {
              const object = Artifact.make();
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                // Absent a caller-supplied target (e.g. the space's generic create menu), navigate to
                // the new Artifact under the Studio section rather than the database subtree.
                targetNodeId: options.targetNodeId ?? getArtifactsPath(options.db.spaceId),
              });
            }),
        },
        {
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
        },
      ]),
    ];
  }),
);
