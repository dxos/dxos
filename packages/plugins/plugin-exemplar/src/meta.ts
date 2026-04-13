//
// Copyright 2025 DXOS.org
//

// Plugin metadata defines the plugin's identity within the framework.
// The `id` follows the reverse-domain convention and must be globally unique.
// The `icon` uses the Phosphor icon naming format: `ph--{name}--{weight}`.
// The `iconHue` sets the color used in the navigation tree.

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.exemplar',
  name: 'Exemplar',
  description: trim`
    Pedagogical reference plugin demonstrating all common DXOS plugin patterns.
    Use this plugin as a guide when building new plugins.
  `,
  icon: 'ph--book-open--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-exemplar',
};
