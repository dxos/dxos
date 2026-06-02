//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.notification'),
  name: 'Notifications',
  author: 'DXOS',
  description: trim`
    Push notifications for Composer. Registers the current device with the Edge notification
    service (Web Push in the browser/PWA, APNs on native iOS) and surfaces incoming
    notifications as in-app toasts when the app is focused.
  `,
  icon: 'ph--bell--regular',
  tags: ['system'],
});
