//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

// TODO(wittjosiah): Derive graph nodes from selected.
export type TreeViewContextValue = {
  selected: string[];
};

export const TreeViewContext: Context<TreeViewContextValue> = createContext<TreeViewContextValue>({ selected: [] });

export const useTreeView = () => useContext(TreeViewContext);
