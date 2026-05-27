//
// Copyright 2025 DXOS.org
//

// Plugin metadata defines the plugin's identity within the framework.
// The `id` follows the reverse-domain convention and must be globally unique.
// The `icon` uses the Phosphor icon naming format: `ph--{name}--{weight}`.
// The `iconHue` sets the color used in the navigation tree.

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.sample'),
  name: 'Sample',
  author: 'DXOS',
  spec: 'PLUGIN.mdl',
  description: trim`
    Pedagogical reference plugin demonstrating all common DXOS plugin patterns
    in a single, well-commented package. The plugin manages a \`SampleItem\` ECHO
    type with \`name\`, \`description\`, and \`status\` fields, and exposes three
    operations: create, randomize, and update-status.

    The plugin illustrates the full plugin anatomy: ECHO schema definition with
    Effect/Schema annotations, typed operation definitions and handlers, app-graph
    extensions for section nodes and per-object actions, and multiple surface
    registrations covering Article, ObjectProperties, plugin settings, status bar,
    plank companion, and deck companion slots.

    Settings are persisted to local KVS via an atom and contributed to the global
    settings panel. A status-bar indicator demonstrates reactive capability
    subscriptions — it appears or disappears immediately when the user toggles the
    corresponding setting.
  `,
  icon: 'ph--book-open--regular',
  iconHue: 'cyan',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sample',
};
