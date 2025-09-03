//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const ASSISTANT_PLUGIN = 'dxos.org/plugin/assistant';

export const ASSISTANT_DIALOG = `${ASSISTANT_PLUGIN}/assistant/dialog`;

export const meta: PluginMeta = {
  id: ASSISTANT_PLUGIN,
  name: 'Assistant',
  description: 'The Assistant plugin allows you to chat with your spaces inside of Composer.',
  icon: 'ph--atom--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-assistant',
  tags: ['labs'],
};
