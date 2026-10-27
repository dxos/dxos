//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as NavigationResolver from '@dxos/app-toolkit/NavigationResolver';
import * as SettingsPath from '@dxos/plugin-settings/SettingsPath';

import { Mailbox } from '#types';

import { InboxNamespace } from '../namespace.ts';
import { getMailboxPath } from '../paths.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      AppCapabilities.NavigationTargetResolver,
      NavigationResolver.forType(Mailbox.Mailbox, {
        getPath: ({ spaceId, objectId }) => getMailboxPath(spaceId, objectId),
        getLabel: (mailbox) => mailbox.name ?? '',
        pages: [
          {
            path: SettingsPath.getPluginSettingsSectionPath(InboxNamespace.key),
            label: 'Inbox settings',
            type: 'settings',
          },
        ],
      }),
    );
  }),
);
