//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.illustrator',
    name: 'Illustrator',
    author: 'DXOS',
    description: trim`
      Headless diagramming host plugin that provides shared infrastructure for local-first
      drawing and diagramming inside DXOS Composer. The plugin owns the base \`Sketch\` ECHO
      type — a named handle referencing a renderer-specific canvas object — together with the
      renderer-neutral scene DSL, the diagram dialect registry, and the agent-facing sketch
      skill and operations (create, read, edit).

      Canvas renderers (tldraw, excalidraw, and others) are contributed by separate plugins
      via the \`IllustratorCapabilities.VariantProvider\` capability. Each variant supplies its
      own canvas schema, a builder that maps the scene DSL onto its records, and surface
      components (Article and Card). Plugin-illustrator resolves the correct variant at
      runtime and delegates rendering and DSL compilation, keeping the host layer fully
      decoupled from renderer internals.

      Canvas objects are stored as hidden ECHO objects alongside the top-level \`Sketch\`,
      ensuring they replicate to all peers but do not appear as independent items in the
      user's space graph.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-illustrator',
    icon: { key: 'ph--compass-tool--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
  },
});
