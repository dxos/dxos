//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.deck',
    name: 'Layout',
    author: 'DXOS',
    description: trim`
      The Deck plugin is the core layout engine for DXOS Composer. It manages the multi-plank
      workspace (the "deck"), sidebar panels, dialogs, popovers, and toast notifications, giving
      users a flexible, persistent workspace they can arrange to match their workflow.

      Subjects are opened as resizable "planks" arranged side by side; a single active plank renders
      fullbleed, and any plank can be toggled to a transient, headless fullscreen overlay. Users
      navigate with stack semantics — opening from a pivot truncates planks to the right and appends
      the new one — with a per-user setting controlling whether navigation replaces the current plank
      or opens a new one alongside it.

      Layout state (active planks, sidebar visibility, plank sizes, companion pane) is persisted
      across sessions via KVS/localStorage. URL routing is handled by the plugin so that any
      workspace configuration can be bookmarked or shared as a deep link.

      All layout changes are expressed through typed LayoutOperations (Open, Close, Set, UpdateSidebar,
      UpdateDialog, UpdatePopover, etc.) that any plugin in the system can dispatch, keeping the layout
      logic centralised and easy to extend.
    `,
    icon: { key: 'ph--layout--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
});
