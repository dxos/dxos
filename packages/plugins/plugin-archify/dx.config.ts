//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.archify',
    name: 'Archify',
    author: 'DXOS',
    description: trim`
      System-architecture diagrams built the Archify way: an agent authors a typed JSON
      intermediate representation (components, boundaries, connections, guided views, legend
      cards), a deterministic validator rejects it with machine-readable repair codes when the
      layout would render badly, and the same IR compiles to SVG in the article, card, section
      and slide surfaces.

      Layout is authored, not inferred. Positions come from explicit coordinates or a fixed grid,
      routes from explicit sides and waypoints — Archify's premise is that an agent that can read
      a codebase can also make layout judgements, and that the tool's job is to check them rather
      than to overrule them with a generic auto-layout pass.

      The diagram is an ECHO object, so it replicates, merges, and is editable by agent operations
      (create, read, write, verify) exposed through the Archify skill.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-archify',
    icon: { key: 'ph--tree-structure--regular', hue: 'cyan' },
    spec: 'PLUGIN.mdl',
    tags: ['alpha'],
  },
});
