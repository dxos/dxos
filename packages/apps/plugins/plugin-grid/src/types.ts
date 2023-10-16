//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const GRID_PLUGIN = 'dxos.org/plugin/grid';

export type GridPluginProvides = GraphProvides & TranslationsProvides;
