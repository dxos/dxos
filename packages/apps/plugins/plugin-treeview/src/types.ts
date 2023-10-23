//
// Copyright 2023 DXOS.org
//

import type { SurfaceProvides, TranslationsProvides } from '@dxos/app-framework';

export const TREE_VIEW_PLUGIN = 'dxos.org/plugin/treeview';

export type TreeViewPluginProvides = SurfaceProvides & TranslationsProvides;

export type TreeViewContextValue = {
  activeId?: string;
  popoverAnchorId?: string;
};
