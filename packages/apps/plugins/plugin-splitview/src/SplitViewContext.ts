//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { SplitViewContextValue } from './types';

export const SplitViewContext: Context<SplitViewContextValue | null> = createContext<SplitViewContextValue | null>(
  null,
);

export const useSplitView = (): SplitViewContextValue =>
  useContext(SplitViewContext) ?? raise(new Error('SplitViewContext not found'));
