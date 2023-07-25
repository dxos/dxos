//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal';

import { IntentProvides } from '@braneframe/plugin-intent';

export const TREE_VIEW_PLUGIN = 'dxos:treeview';

export enum TreeViewAction {
  SELECT = `${TREE_VIEW_PLUGIN}:select`,
}

// TODO(wittjosiah): Derive graph nodes from selected.
export type TreeViewContextValue = DeepSignal<{
  selected: string[];
}>;

export type TreeViewPluginProvides = IntentProvides & {
  treeView: TreeViewContextValue;
};
