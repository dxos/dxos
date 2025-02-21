//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const EXCALIDRAW_PLUGIN = 'dxos.org/plugin/excalidraw';

export const meta = {
  id: EXCALIDRAW_PLUGIN,
  name: 'Excalidraw',
  description: 'Excalidraw is a popular diagraming tool powered by Excalidraw’s open source graph editor.',
  icon: 'ph--compass-tool--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-excalidraw',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-excalidraw-dark.png'],
} satisfies PluginMeta;
