//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const MERMAID_PLUGIN = 'dxos.org/plugin/mermaid';

export default {
  id: MERMAID_PLUGIN,
  name: 'Mermaid',
  description: 'Tool that renders text definitions to create diagrams.',
  icon: 'ph--anchor-simple--regular',
} satisfies PluginMeta;
