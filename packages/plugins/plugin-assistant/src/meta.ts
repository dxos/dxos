//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/assistant',
  name: 'Assistant',
  description: 'The Assistant plugin allows you to chat with your spaces inside of Composer.',
  icon: 'ph--atom--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-assistant',
  tags: ['labs'],
};

export const ASSISTANT_DIALOG = `${meta.id}/assistant/dialog`;
