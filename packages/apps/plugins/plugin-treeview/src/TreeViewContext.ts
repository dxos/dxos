//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { TreeViewContextValue } from './types';

export const TreeViewContext: Context<TreeViewContextValue | null> = createContext<TreeViewContextValue | null>(null);

export const useTreeView = (): TreeViewContextValue =>
  useContext(TreeViewContext) ?? raise(new Error('useTreeView: missing context'));
