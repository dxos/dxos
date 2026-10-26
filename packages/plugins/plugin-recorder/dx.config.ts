//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.recorder',
    name: 'Recorder',
    author: 'DXOS',
    description: trim`
      Record the voice-over of a presentation while you present it, reading each slide's speaker notes.
      Takes are kept with the presentation, with each slide's recorded length against its desired length.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-recorder',
    icon: { key: 'ph--record--regular', hue: 'red' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.presenter', 'org.dxos.plugin.file'],
  },
});
