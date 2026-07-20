//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, type AppCapabilities as AppCaps, Paths } from '@dxos/app-toolkit';
import { Database, Entity } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { getPluginSettingsSectionPath } from '@dxos/plugin-settings';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
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

    return Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver);
  }),
);
