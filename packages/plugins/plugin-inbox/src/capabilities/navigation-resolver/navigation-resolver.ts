//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, getSpaceIdFromPath, getSpacePath, type AppCapabilities as AppCaps } from '@dxos/app-toolkit';
import { Database, Key, Ref } from '@dxos/echo';
import { EchoId } from '@dxos/keys';
import { SETTINGS_ID, SETTINGS_KEY } from '@dxos/plugin-settings/types';

import { meta } from '../../meta';
import { getMailboxAllMailPath, getMailboxesSectionId } from '../../paths';
import { Mailbox } from '../../types';

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

        const dxn = EchoId.tryParse(query.dxn.startsWith('@dxn:') ? query.dxn.slice(1) : query.dxn);
        if (!dxn) {
          return [];
        }

        const ref = Ref.fromDXN(dxn);
        const object = yield* Database.resolve(ref).pipe(Effect.catchAll(() => Effect.succeed(null)));
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
    const pathResolver: AppCaps.NavigationPathResolver = (qualifiedPath) => {
      const segments = qualifiedPath.split('/');
      const spaceId = getSpaceIdFromPath(qualifiedPath);
      const mailboxesIdx = segments.indexOf(getMailboxesSectionId());
      const mailboxId = mailboxesIdx >= 0 ? segments[mailboxesIdx + 1] : undefined;
      if (spaceId && mailboxId && Key.ObjectId.isValid(mailboxId)) {
        return Effect.succeed(Option.some(EchoId.fromSpaceAndObjectId(spaceId, mailboxId as Key.ObjectId)));
      }
      return Effect.succeed(Option.none());
    };

    return [
      Capability.contributes(AppCapabilities.NavigationTargetResolver, resolver),
      Capability.contributes(AppCapabilities.NavigationPathResolver, pathResolver),
    ];
  }),
);
