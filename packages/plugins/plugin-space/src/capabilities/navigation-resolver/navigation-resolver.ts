//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  Segments,
  getObjectPath,
  getSpaceIdFromPath,
  getSpacePath,
  type AppCapabilities as AppCaps,
} from '@dxos/app-toolkit';
import { Database, Entity, Key } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { SETTINGS_ID, SETTINGS_KEY } from '@dxos/plugin-settings/types';

import { meta } from '../../meta';

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
    // Validates that the object actually exists in the space before returning a DXN.
    const client = yield* Capability.get(ClientCapabilities.Client);
    const pathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) => {
      const segments = qualifiedPath.split('/');
      const spaceId = getSpaceIdFromPath(qualifiedPath);
      const objectId = segments[segments.length - 1];
      if (
        !spaceId ||
        !objectId ||
        !Key.ObjectId.isValid(objectId) ||
        !segments.includes(Segments.types) ||
        !segments.includes('all')
      ) {
        return Effect.succeed(Option.none());
      }

      const space = client.spaces.get(spaceId);
      if (!space) {
        return Effect.succeed(Option.none());
      }

      const dxn = DXN.fromSpaceAndObjectId(spaceId, objectId as Key.ObjectId);
      const ref = space.db.makeRef(dxn);
      return Database.loadOption(ref).pipe(
        Effect.map((option) => (Option.isSome(option) ? Option.some(dxn) : Option.none<DXN>())),
      );
    };

    return [
      Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, pathResolver),
    ];
  }),
);
