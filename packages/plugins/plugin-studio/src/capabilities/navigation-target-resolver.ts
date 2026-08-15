//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Database, DXN, EID, Obj, Type } from '@dxos/echo';
import { Position } from '@dxos/util';

import { Artifact } from '#types';

import { getArtifactPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const resolver: AppCapabilities.NavigationTargetResolver = (query) =>
      Effect.gen(function* () {
        if (!query?.uri) {
          return [];
        }

        const targetUri = EID.tryParse(query.uri) ?? DXN.tryMake(query.uri);
        if (!targetUri) {
          return [];
        }

        const { db } = yield* Database.Service;
        const ref = db.makeRef(targetUri);
        const object = yield* Database.load(ref).pipe(Effect.catch(() => Effect.succeed(null)));
        if (!object || !Obj.instanceOf(Artifact.Artifact, object)) {
          return [];
        }

        // The Studio section lists every Artifact in the space regardless of collection membership, so
        // it is the type's home and outranks the generic collection/database answers.
        return [
          {
            path: getArtifactPath(db.spaceId, object.id),
            label: object.name ?? '',
            type: Type.getTypename(Artifact.Artifact),
            position: Position.first,
          },
        ];
      });

    return Capability.contribute(AppCapabilities.NavigationTargetResolver, resolver);
  }),
);
