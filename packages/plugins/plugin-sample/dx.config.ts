//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.sample',
    name: 'Sample',
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
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sample',
    icon: { key: 'ph--book-open--regular', hue: 'cyan' },
    spec: 'PLUGIN.mdl',
  },
});
