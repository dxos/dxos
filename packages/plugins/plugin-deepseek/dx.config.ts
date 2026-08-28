//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.deepseek',
    name: 'DeepSeek',
    author: 'DXOS',
    description: trim`
      DeepSeek registers a Connector for deepseek.com so the user can paste their DeepSeek API key.
      The key is stored as an AccessToken (source deepseek.com) plus a Connection in ECHO, resolvable by
      other plugins via CredentialsService. This plugin is headless — it contributes the connector only
      and has no UI surfaces.
    `,
    icon: { key: 'px--deepseek--regular', hue: 'blue' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-deepseek',
    tags: ['labs'],
  },
});
