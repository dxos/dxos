//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal';

import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';

export const TREE_VIEW_PLUGIN = 'dxos.org/plugin/treeview';

const TREE_VIEW_ACTION = `${TREE_VIEW_PLUGIN}/action`;
export enum TreeViewAction {
  ACTIVATE = `${TREE_VIEW_ACTION}/activate`,
}

// TODO(wittjosiah): Derive graph nodes from selected.
export type TreeViewContextValue = DeepSignal<{
  active: string[];
}>;

export type TreeViewPluginProvides = IntentProvides &
  TranslationsProvides & {
    treeView: TreeViewContextValue;
  };
