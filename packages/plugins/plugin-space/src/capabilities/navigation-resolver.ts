//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, type AppCapabilities as AppCaps, AppSpace, Paths } from '@dxos/app-toolkit';
import { Database, Entity, Key } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { getPluginSettingsSectionPath } from '@dxos/plugin-settings';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const capabilities = yield* Capability.Service;

    // TODO(wittjosiah): Remove cast once NavigationTargetResolver type includes Database.Service.
    const resolver: AppCaps.NavigationTargetResolver = ((query) =>
      Effect.gen(function* () {
        if (!query?.uri) {
          return [
            {
              path: getPluginSettingsSectionPath(meta.profile.key),
              label: 'Spaces settings',
              type: 'settings',
            },
          ];
        }

        const eid = EID.tryParse(query.uri);
        if (!eid) {
          return [];
        }

        const { db } = yield* Database.Service;
        const ref = db.makeRef(eid);
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
            path: Paths.getObjectPath(db.spaceId, typename, object.id),
            label: Entity.getLabel(object) ?? '',
            type: typename,
          },
        ];
      })) as AppCaps.NavigationTargetResolver;

    // Parse object paths into EIDs (structure only; existence is checked by the caller).
    // Handles canonical database paths (root/<spaceId>/system/database/<typeSlug>/<objectId>)
    // and collection paths (root/<spaceId>/content/collections/<collectionId>/<objectId>): the space
    // id is the first segment and the object id the last, regardless of intervening group segments.
    const pathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) => {
      const segments = qualifiedPath.split('/');
      const spaceId = Paths.getSpaceIdFromPath(qualifiedPath);
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
      const space = AppSpace.getActiveSpace(client, capabilities);
      if (!space) {
        return Effect.succeed(Option.none());
      }
      return Effect.succeed(Option.some(EID.make({ spaceId: space.id, entityId: path as Key.EntityId })));
    };

    return [
      Capability.contribute(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contribute(AppCapabilities.NavigationPathResolver, pathResolver),
      Capability.contribute(AppCapabilities.NavigationPathResolver, bareEntityPathResolver),
    ];
  }),
);
