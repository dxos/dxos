//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.stack',
    name: 'Stacks',
    author: 'DXOS',
    description: trim`
      The Stack plugin renders any Collection as a vertically scrollable stack of collapsible sections in the
      Composer article surface. Each section wraps an arbitrary ECHO object and delegates its content rendering
      to the section surface role, enabling any other plugin to contribute its own section renderer.

      Sections can be individually collapsed to show only their title, expanded to reveal full content, navigated
      to directly, or removed from the collection. New sections can be inserted before or after any existing
      section via a per-section dropdown menu, or appended via the toolbar Add button.

      The plugin registers StackViewType with the ECHO schema module so that per-section view metadata
      (height overrides, custom display data) can be stored and replicated alongside the collection.

      A settings panel exposes a separation toggle that controls whether visual dividers are rendered between
      sections.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-stack',
    icon: { key: 'ph--stack-simple--regular' },
    spec: 'PLUGIN.mdl',
  },
});
