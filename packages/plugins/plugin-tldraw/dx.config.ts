//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.tldraw',
    name: 'tldraw',
    author: 'DXOS',
    description: trim`
      tldraw is the canvas renderer that powers collaborative whiteboards in DXOS Composer,
      giving every workspace a full-featured infinite canvas. Draw freehand strokes, place
      geometric shapes, add text and arrows, and organise ideas visually — all within the same
      local-first environment as the rest of your documents.

      The plugin contributes a sketch variant to the Illustrator plugin: the base \`Sketch\`
      object references a tldraw Canvas whose content is stored as a plain JSON record in ECHO,
      so no binary blobs or external storage are required. Toolbar actions, grid settings, and
      custom tools are wired through the Composer plugin system, and a builder maps the
      Illustrator scene DSL onto tldraw records so agents can draw and edit diagrams.

      Because Canvas data lives in ECHO, every edit is replicated peer-to-peer in real time.
      Collaborators see each other's strokes as they draw, and changes made offline merge
      automatically when connectivity is restored using ECHO's CRDT semantics.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tldraw',
    dependsOn: ['org.dxos.plugin.illustrator'],
    icon: { key: 'ph--compass-tool--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
    screenshots: [{ dark: 'https://dxos.network/plugin-details-sketch-dark.png' }],
  },
});
