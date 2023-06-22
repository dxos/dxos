//
// Copyright 2023 DXOS.org
//

import React, { createContext, useContext } from 'react';

import { createStore } from '@dxos/observable-object';

import { definePlugin } from '../../framework';
import { TreeViewContainer } from './TreeViewContainer';

// TODO(wittjosiah): Derive graph nodes from selected.
export type TreeViewContextValue = {
  selected: string[];
};

const store = createStore<TreeViewContextValue>({ selected: [] });

const Context = createContext<TreeViewContextValue>(store);

export const useTreeView = () => useContext(Context);

export const selectedToUri = (selected: string[]) => selected.join('/').replace(':', '/');

export type TreeViewProvides = {
  treeView: TreeViewContextValue;
};

export const TreeViewPlugin = definePlugin<TreeViewProvides, {}>({
  meta: {
    id: 'dxos:treeview',
  },
  provides: {
    treeView: store,
    context: ({ children }) => {
      return <Context.Provider value={store}>{children}</Context.Provider>;
    },
    components: { TreeView: TreeViewContainer },
  },
});
