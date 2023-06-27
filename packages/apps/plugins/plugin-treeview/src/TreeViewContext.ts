//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { TreeViewContextValue } from './types';

export const TreeViewContext: Context<TreeViewContextValue> = createContext<TreeViewContextValue>({ selected: [] });

export const useTreeView = () => useContext(TreeViewContext);
