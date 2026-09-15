//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.higgsfield',
    name: 'Higgsfield',
    author: 'DXOS',
    description: trim`
      Higgsfield contributes image and video generation providers to Composer. It registers a Connector
      for higgsfield.ai (an API key id + secret credential form) so the user can connect their Higgsfield
      Cloud account, and implements the plugin-studio GenerationService capability for kinds 'image' and
      'video' by calling the Higgsfield HTTP API — an asynchronous request that is submitted to a model
      endpoint then polled to completion. The model path is the kind-specific request config. The
      credential is resolved at generation time via CredentialsService. This plugin is headless — it
      contributes services only and has no UI surfaces.
    `,
    icon: { key: 'ph--scribble-loop--regular', hue: 'lime' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-higgsfield',
    dependsOn: ['org.dxos.plugin.studio'],
    tags: ['labs'],
  },
});
