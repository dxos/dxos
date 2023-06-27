//
// Copyright 2023 DXOS.org
//

// TODO(wittjosiah): Derive graph nodes from selected.
export type TreeViewContextValue = {
  selected: string[];
};

export type TreeViewProvides = {
  treeView: TreeViewContextValue;
};
