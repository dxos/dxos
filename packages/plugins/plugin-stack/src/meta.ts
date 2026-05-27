//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const SECTION_IDENTIFIER = DXN.make('org.dxos.type.stackSection');

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.stack'),
  // TODO(wittjosiah): Prevents "stacks" language from being exposed to users in settings panel.
  //   Conside renaming this to the collection plugin and trying to factor more collections logic from the space plugin.
  name: 'Collections',
  author: 'DXOS',
  spec: 'PLUGIN.mdl',
  description: trim`
    StackPlugin renders any Collection object as a vertically scrollable stack of collapsible sections in the
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
  icon: 'ph--stack-simple--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-stack',
};
