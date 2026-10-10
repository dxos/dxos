//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.handpan',
    name: 'Handpan',
    author: 'DXOS',
    description: trim`
      Record handpan music notation in a bar grid and transcribe it from live audio.
      Calibrate the detector to your instrument, then see each note as you play it.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-handpan',
    icon: { key: 'ph--record--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.sequencer'],
  },
});
