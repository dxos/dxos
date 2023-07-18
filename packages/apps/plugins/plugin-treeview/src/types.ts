//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal';

// TODO(wittjosiah): Derive graph nodes from selected.
export type TreeViewContextValue = DeepSignal<{
  selected: string[];
}>;

export type TreeViewProvides = {
  treeView: TreeViewContextValue;
};
