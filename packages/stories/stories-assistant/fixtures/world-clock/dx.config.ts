//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.example.plugin.worldClock',
    name: 'World Clock',
    icon: { key: 'ph--globe-hemisphere-west--regular', hue: 'sky' },
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.map'],
    spec: 'PLUGIN.mdl',
  },
});
