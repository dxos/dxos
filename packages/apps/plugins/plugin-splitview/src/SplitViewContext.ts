//
// Copyright 2023 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { SplitViewState } from './types';

export const SplitViewContext: Context<SplitViewState | null> = createContext<SplitViewState | null>(null);

export const useSplitView = (): SplitViewState =>
  useContext(SplitViewContext) ?? raise(new Error('Missing SplitViewContext'));
