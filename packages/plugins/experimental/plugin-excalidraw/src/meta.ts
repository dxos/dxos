//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const EXCALIDRAW_PLUGIN = 'dxos.org/plugin/excalidraw';

export const meta = {
  id: EXCALIDRAW_PLUGIN,
  name: 'Excalidraw',
  description: 'Diagramming tool.',
  icon: 'ph--compass-tool--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-excalidraw',
  tags: ['experimental'],
} satisfies PluginMeta;
