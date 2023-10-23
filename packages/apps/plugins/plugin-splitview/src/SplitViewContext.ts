//
// Copyright 2023 DXOS.org
//

import { type Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type LayoutState } from './types';

export const SplitViewContext: Context<LayoutState | null> = createContext<LayoutState | null>(null);

export const useSplitView = (): LayoutState =>
  useContext(SplitViewContext) ?? raise(new Error('Missing SplitViewContext'));
