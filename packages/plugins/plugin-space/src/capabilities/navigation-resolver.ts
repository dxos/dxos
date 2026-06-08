//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  getObjectPath,
  getSpaceIdFromPath,
  getSpacePath,
  type AppCapabilities as AppCaps,
} from '@dxos/app-toolkit';
import { Database, Entity, Key } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { SETTINGS_ID, SETTINGS_KEY } from '@dxos/plugin-settings';

import { meta } from '#meta';

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

        const dxn = EID.tryParse(query.dxn.startsWith('@dxn:') ? query.dxn.slice(1) : query.dxn);
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

    // Parse object paths into EIDs (structure only; existence is checked by the caller).
    // Handles canonical type paths (root/<spaceId>/types/<typename>/all/<objectId>)
    // and collection paths (root/<spaceId>/collections/<collectionId>/<objectId>): the space id
    // is the first segment and the object id the last.
    const pathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) => {
      const segments = qualifiedPath.split('/');
      const spaceId = getSpaceIdFromPath(qualifiedPath);
      const objectId = segments[segments.length - 1];
      if (!spaceId || !objectId || !Key.EntityId.isValid(objectId)) {
        return Effect.succeed(Option.none());
      }
      return Effect.succeed(Option.some(EID.make({ spaceId, entityId: objectId as Key.EntityId })));
    };

    // Resolve a bare entity ID (no path separators) against the current space.
    // Agents sometimes pass raw entity IDs from object creation results instead of full paths.
    const bareEntityPathResolver: AppCaps.NavigationPathResolver = (path) => {
      if (path.includes('/') || !Key.EntityId.isValid(path)) {
        return Effect.succeed(Option.none());
      }
      return Effect.gen(function* () {
        const { db } = yield* Database.Service;
        return Option.some(EID.make({ spaceId: db.spaceId, entityId: path as Key.EntityId }));
      });
    };

    return [
      Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, pathResolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, bareEntityPathResolver),
    ];
  }),
);
