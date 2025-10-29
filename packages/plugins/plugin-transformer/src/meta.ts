//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/transformer',
  name: 'Transformer',
  description: trim`
    Execute local machine learning transformers and AI models directly in your browser.
    Run embeddings, classifications, and other ML tasks without server dependencies.
  `,
  icon: 'ph--cpu--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-transformer',
  tags: ['labs'],
};
