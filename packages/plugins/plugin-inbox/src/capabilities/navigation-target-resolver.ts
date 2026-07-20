//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Database, Type } from '@dxos/echo';
import { DXN, EID } from '@dxos/keys';
import { getPluginSettingsSectionPath } from '@dxos/plugin-settings';

import { meta } from '#meta';
import { Mailbox } from '#types';

import { getMailboxPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // TODO(wittjosiah): Remove cast once NavigationTargetResolver type includes Database.Service.
    const resolver: AppCapabilities.NavigationTargetResolver = ((query) =>
      Effect.gen(function* () {
        if (!query?.uri) {
          return [
            {
              path: getPluginSettingsSectionPath(meta.profile.key),
              label: 'Inbox settings',
              type: 'settings',
            },
          ];
        }

        const targetUri = EID.tryParse(query.uri) ?? DXN.tryMake(query.uri);
        if (!targetUri) {
          return [];
        }

        const { db } = yield* Database.Service;
        const ref = db.makeRef(targetUri);
        const object = yield* Database.load(ref).pipe(Effect.catchAll(() => Effect.succeed(null)));
        if (!object || !Mailbox.instanceOf(object)) {
          return [];
        }

        return [
          {
            path: getMailboxPath(db.spaceId, object.id),
            label: (object as Mailbox.Mailbox).name ?? '',
            type: Type.getTypename(Mailbox.Mailbox),
          },
        ];
      })) as AppCapabilities.NavigationTargetResolver;

    return Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver);
  }),
);
