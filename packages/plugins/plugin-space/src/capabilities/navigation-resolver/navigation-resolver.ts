//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, Segments, getObjectPath, getSpaceIdFromPath, getSpacePath, type AppCapabilities as AppCaps } from '@dxos/app-toolkit';
import { Database, Entity, Key } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '../../meta';

const SETTINGS_ID = '!dxos:settings';
const SETTINGS_KEY = 'settings';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // TODO(wittjosiah): Remove cast once NavigationTargetResolver type includes Database.Service.
    const resolver: AppCaps.NavigationTargetResolver = ((query) =>
      Effect.gen(function* () {
        if (!query?.dxn) {
          return [
            {
              path: `${getSpacePath(SETTINGS_ID)}/${SETTINGS_KEY}:${meta.id.replaceAll('/', ':')}`,
              label: 'Spaces settings',
              type: 'settings',
            },
          ];
        }

        const dxn = DXN.tryParse(query.dxn.startsWith('@dxn:') ? query.dxn.slice(1) : query.dxn);
        if (!dxn) {
          return [];
        }

        const { db } = yield* Database.Service;
        const ref = db.makeRef(dxn);
        const object = yield* Database.load(ref).pipe(Effect.catchAll(() => Effect.succeed(null)));
        if (!object) {
          return [];
        }

        const typename = Entity.getTypename(object);
        if (!typename) {
          return [];
        }

        return [
          {
            path: getObjectPath(db.spaceId, typename, object.id),
            label: Entity.getLabel(object) ?? '',
            type: typename,
          },
        ];
      })) as AppCaps.NavigationTargetResolver;

    // Resolve canonical object paths (root/<spaceId>/types/<typename>/all/<objectId>) to DXNs.
    const pathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) =>
      Effect.succeed((() => {
        const segments = qualifiedPath.split('/');
        const spaceId = getSpaceIdFromPath(qualifiedPath);
        const objectId = segments[segments.length - 1];
        if (
          spaceId &&
          objectId &&
          Key.ObjectId.isValid(objectId) &&
          segments.includes(Segments.types) &&
          segments.includes('all')
        ) {
          return DXN.fromSpaceAndObjectId(spaceId, objectId as Key.ObjectId);
        }
        return undefined;
      })());

    return [
      Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, pathResolver),
    ];
  }),
);
