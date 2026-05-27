//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.mapSolid'),
  name: 'Maps (Solid)',
  author: 'DXOS',
  description: trim`
    SolidJS-native map surface plugin that renders ECHO Map objects as interactive tile maps or 3-D globes.
    Implements the map surface as a SolidJS Web Component (dx-map-surface), providing fine-grained reactivity
    for high-frequency geospatial updates without the overhead of a React reconciler.

    The component derives geographic markers reactively from the Map's linked View: as rows are added or
    updated in the underlying ECHO dataset, pins appear or move on the map without a full remount.
    Two rendering modes are available — a standard 2-D tile map and an interactive 3-D globe —
    toggled locally per surface instance.

    The custom element uses noShadowDOM so host Tailwind utility classes apply inside the component,
    ensuring consistent styling with the rest of the Composer shell.
    This plugin is designed to complement plugin-map, which owns the Map ECHO schema and object-creation flow.
  `,
  icon: 'ph--compass--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-map-solid',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-map-dark.png'],
};
