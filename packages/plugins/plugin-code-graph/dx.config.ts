//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.codeGraph',
    name: 'Code Graph',
    author: 'DXOS',
    description: trim`
      A canvas of the codebase, built from code-index: packages, files and symbols as boxes and their
      imports and dependencies as arrows. The assistant fills and reshapes the graph by querying the index,
      and the canvas lays it out with the illustrator's semantic engine, a force-directed layout, or by rank.

      Dev only: the index is reached through a vite dev-server route (\`vite dev\` or \`tauri dev\`) that runs
      \`code-index mcp\` beside the app.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-code-graph',
    icon: { key: 'ph--graph--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    // The command bar's judge is a decision model, and TypeSafe is the plugin that serves them.
    dependsOn: ['org.dxos.plugin.typesafe'],
  },
});
