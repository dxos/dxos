//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.spotlight',
    name: 'Spotlight',
    author: 'DXOS',
    description: trim`
      The Spotlight plugin drives the Tauri popover window that gives users instant keyboard
      access to Composer commands and navigation from anywhere on the desktop. It renders the
      commands dialog as its primary content inside a permanently-open, non-modal dialog so the
      underlying surface has the Radix context it requires.

      Layout operations that modify the main Composer window (Open, SwitchWorkspace) are
      intercepted and forwarded to the main window via Tauri inter-window events, then the
      spotlight panel is dismissed. Operations that are irrelevant in the popover context
      (UpdateSidebar, UpdatePopover, etc.) are silently ignored.

      The panel auto-dismisses when the window loses focus or the user presses Escape, and
      resets to the default commands dialog each time it regains focus. A short debounce on
      programmatic dismiss allows actions in the commands dialog to switch content before
      the window hides.

      The plugin is Tauri-only; all Tauri API calls are guarded by isTauri() so the module
      loads safely in browser-based test environments.
    `,
    spec: 'PLUGIN.mdl',
    icon: { key: 'ph--magnifying-glass--regular' },
    tags: ['system'],
  },
});
