//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.mailLayout',
  name: 'Mail Layout',
  description: trim`
    Minimal master/detail layout for the Composer /mail entry point. Renders the user's
    personal-space mailbox on the left and the selected message on the right, with no
    sidebars or navigation chrome.
  `,
  icon: 'ph--tray--regular',
};
