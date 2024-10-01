//
// Copyright 2023 DXOS.org
//

import { pluginMeta } from '@dxos/app-framework';

export const GITHUB_PLUGIN = 'dxos.org/plugin/github';
export const GITHUB_PLUGIN_SHORT_ID = 'github';

export default pluginMeta({
  id: GITHUB_PLUGIN,
  shortId: GITHUB_PLUGIN_SHORT_ID,
  name: 'GitHub',
  description: 'GitHub integration.',
  tags: ['experimental'],
  icon: 'ph--github-logo--regular',
});
