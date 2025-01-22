//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const MERMAID_PLUGIN = 'dxos.org/plugin/mermaid';

export const meta = {
  id: MERMAID_PLUGIN,
  name: 'Mermaid',
  description: 'Tool that renders text definitions to create diagrams.',
  icon: 'ph--anchor-simple--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-mermaid',
} satisfies PluginMeta;
