//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/assistant',
  name: 'Assistant',
  description: 'Chat with your spaces using AI assistance.',
  icon: 'ph--atom--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-assistant',
  tags: ['labs'],
};

export const ASSISTANT_DIALOG = `${meta.id}/assistant/dialog`;
