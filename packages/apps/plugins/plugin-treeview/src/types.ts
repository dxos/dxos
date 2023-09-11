//
// Copyright 2023 DXOS.org
//

import { Graph } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { AppState } from '@braneframe/types';

export const TREE_VIEW_PLUGIN = 'dxos.org/plugin/treeview';

const TREE_VIEW_ACTION = `${TREE_VIEW_PLUGIN}/action`;
export enum TreeViewAction {
  ACTIVATE = `${TREE_VIEW_ACTION}/activate`,
}

export type TreeViewContextValue = {
  active: string | undefined;
  previous: string | undefined;
  activeNode: Graph.Node | undefined;
  previousNode: Graph.Node | undefined;
  appState: AppState | undefined;
};

export type TreeViewPluginProvides = IntentProvides &
  TranslationsProvides & {
    treeView: Readonly<TreeViewContextValue>;
  };
