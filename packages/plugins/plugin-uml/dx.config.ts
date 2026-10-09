//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.uml',
    name: 'UML',
    author: 'DXOS',
    description: trim`
      UML for drawings: an assistant skill that draws class diagrams in any drawing,
      and a class shape (name, attributes and methods) for the canvas.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-uml',
    dependsOn: ['org.dxos.plugin.illustrator'],
    icon: { key: 'ph--tree-structure--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
