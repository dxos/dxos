//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.mobile',
    name: 'Mobile',
    author: 'DXOS',
    description: trim`
      Mobile shell for DXOS Composer: a renderer over the Deck plugin's layout state, never a second
      state owner. The active deck is projected as a UIKit-style navigation stack — one full-screen
      panel at a time, an app bar for the panel's own actions, a navbar for its companions, and a
      companion drawer that shares the screen with the keyboard.

      Graph root and branch nodes are rendered as their own searchable full-screen surfaces (Home and
      NavBranch) instead of the desktop deck's side-by-side planks, so navigating into a workspace,
      a collection, or a settings section pushes a panel rather than opening a plank.

      Registered alongside the Deck plugin on mobile: Deck keeps all state, operations, and URL
      routing, and contributes no root of its own there.
    `,
    icon: { key: 'ph--device-mobile--regular' },
    tags: ['system'],
  },
});
