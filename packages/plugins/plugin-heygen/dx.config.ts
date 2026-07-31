//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.heygen',
    name: 'HeyGen',
    author: 'DXOS',
    description: trim`
      HeyGen contributes a video-generation provider to Composer. It registers a Connector for
      heygen.com (an API-key credential form) so the user can connect their account, and implements the
      plugin-studio GenerationService capability (kind 'video') by calling the HeyGen HTTP API — an
      asynchronous job that is submitted then polled to completion. Avatar/voice ids are the
      kind-specific request config. The credential is resolved at generation time via CredentialsService.
      This plugin is headless — it contributes services only and has no UI surfaces.
    `,
    icon: { key: 'ph--film-reel--regular', hue: 'fuchsia' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-heygen',
    dependsOn: ['org.dxos.plugin.studio'],
    tags: ['labs'],
  },
});
