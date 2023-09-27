//
// Copyright 2023 DXOS.org
//

import { TranslationsProvides } from '@braneframe/plugin-theme';

export const TREE_VIEW_PLUGIN = 'dxos.org/plugin/treeview';

export type TreeViewPluginProvides = TranslationsProvides;

export type TreeViewContextValue = {
  activeId?: string;
  popoverAnchorId?: string;
};
