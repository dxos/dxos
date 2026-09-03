//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as NavigationResolver from '@dxos/app-toolkit/NavigationResolver';
import { Position } from '@dxos/util';

import { Artifact } from '#types';

import { getArtifactPath } from '../paths.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      AppCapabilities.NavigationTargetResolver,
      NavigationResolver.forType(Artifact.Artifact, {
        getPath: ({ spaceId, objectId }) => getArtifactPath(spaceId, objectId),
        getLabel: (artifact) => artifact.name ?? '',
        // The Studio section lists every Artifact in the space regardless of collection membership,
        // so it is the type's home and outranks the generic collection/database answers.
        position: Position.first,
      }),
    );
  }),
);
