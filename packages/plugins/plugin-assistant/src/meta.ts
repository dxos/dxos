//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/assistant',
  name: 'Assistant',
  description: trim`
    Intelligent AI assistant that can analyze and interact with objects across your spaces.
    Chat naturally to get insights, search content, and perform actions using AI-powered context awareness.
  `,
  icon: 'ph--atom--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-assistant',
  tags: ['labs'],
};

export const ASSISTANT_DIALOG = `${meta.id}/assistant/dialog`;
