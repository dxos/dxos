//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.projects',
    name: 'Projects',
    author: 'DXOS',
    description: trim`
      Projects: interactive, long-running processes composed of instructions, skills,
      sentinel commands, routines, artifacts, and AI chat sessions in project context.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-projects',
    icon: { key: 'ph--stack--regular', hue: 'sky' },
    tags: ['alpha', 'assistant'],
    // Assistant is a hard dependency: the article's chat actions and task delegation invoke its
    // operations, so a host that runs Projects must run Assistant beside it.
    dependsOn: ['org.dxos.plugin.assistant', 'org.dxos.plugin.tasks'],
  },
});
