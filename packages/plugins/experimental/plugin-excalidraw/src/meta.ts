//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SKETCH_PLUGIN = 'dxos.org/plugin/excalidraw';

export default {
  id: SKETCH_PLUGIN,
  name: 'Excalidraw',
  description: 'Diagramming tool.',
  tags: ['experimental'],
  icon: 'ph--compass-tool--regular',
} satisfies PluginMeta;
