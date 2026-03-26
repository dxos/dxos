//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, getSpacePath, type AppCapabilities as AppCaps } from '@dxos/app-toolkit';
import { Database } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '../../meta';
import { getMailboxAllMailPath } from '../../paths';
import { Mailbox } from '../../types';

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
              label: 'Inbox settings',
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
        if (!object || !Mailbox.instanceOf(object)) {
          return [];
        }

        return [
          {
            path: getMailboxAllMailPath(db.spaceId, object.id),
            label: (object as Mailbox.Mailbox).name ?? '',
            type: Mailbox.Mailbox.typename,
          },
        ];
      })) as AppCaps.NavigationTargetResolver;

    return Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver);
  }),
);
