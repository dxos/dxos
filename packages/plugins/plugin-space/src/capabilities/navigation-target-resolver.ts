//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, type AppCapabilities as AppCaps, GraphPath } from '@dxos/app-toolkit';
import { Database, Entity } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { getPluginSettingsSectionPath } from '@dxos/plugin-settings';

import { meta } from '#meta';

import { resolveCollectionObjectPath } from '../collection-path';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const resolver: AppCaps.NavigationTargetResolver = (query) =>
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

        const label = Entity.getLabel(object) ?? '';

        // Where the tree actually shows the object, when it lives in the collection tree. Offered ahead
        // of the database path, which every object has but no visible node bears.
        const collectionPath = yield* resolveCollectionObjectPath({ objectId: object.id });

        return [
          ...(collectionPath ? [{ path: collectionPath, label, type: typename }] : []),
          {
            path: GraphPath.getObjectPath(db.spaceId, typename, object.id),
            label,
            type: typename,
            fallback: true,
          },
        ];
      });

    return Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver);
  }),
);
