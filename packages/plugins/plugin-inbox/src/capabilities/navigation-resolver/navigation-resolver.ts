//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, getSpaceIdFromPath, getSpacePath, type AppCapabilities as AppCaps } from '@dxos/app-toolkit';
import { Database, Key } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '../../meta';
import { getMailboxAllMailPath, getMailboxesSectionId } from '../../paths';
import { Mailbox } from '../../types';

const SETTINGS_ID = '!dxos:settings';
const SETTINGS_KEY = 'settings';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // TODO(wittjosiah): Remove cast once NavigationTargetResolver type includes Database.Service.
    const resolver: AppCapabilities.NavigationTargetResolver = ((query) =>
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
      })) as AppCapabilities.NavigationTargetResolver;

    // Resolve mailbox paths (root/<spaceId>/mailboxes/<mailboxId>/...) to DXNs.
    const pathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) =>
      Effect.succeed(
        (() => {
          const segments = qualifiedPath.split('/');
          const spaceId = getSpaceIdFromPath(qualifiedPath);
          const mailboxesIdx = segments.indexOf(getMailboxesSectionId());
          const mailboxId = mailboxesIdx >= 0 ? segments[mailboxesIdx + 1] : undefined;
          if (spaceId && mailboxId && Key.ObjectId.isValid(mailboxId)) {
            return DXN.fromSpaceAndObjectId(spaceId, mailboxId as Key.ObjectId);
          }
          return undefined;
        })(),
      );

    return [
      Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, pathResolver),
    ];
  }),
);
