//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.ideogram',
    name: 'Ideogram',
    author: 'DXOS',
    description: trim`
      Ideogram contributes an image-generation provider to Composer. It registers a Connector for
      ideogram.ai (an API-key credential form) so the user can connect their account, and implements the
      plugin-studio ImageGenerationService capability by calling the Ideogram HTTP API. The credential
      is resolved at generation time via CredentialsService. This plugin is headless — it contributes services
      only and has no UI surfaces.
    `,
    icon: { key: 'ph--sparkle--regular', hue: 'amber' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-ideogram',
    dependsOn: ['org.dxos.plugin.studio'],
    tags: ['labs'],
  },
});
