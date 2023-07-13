//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal';
import { Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

export type SplitViewContextValue = DeepSignal<{
  sidebarOpen: boolean;
  dialogContent: any;
  dialogOpen: boolean;
}>;

export const SplitViewContext: Context<SplitViewContextValue | null> = createContext<SplitViewContextValue | null>(
  null,
);

export const useSplitView = (): SplitViewContextValue =>
  useContext(SplitViewContext) ?? raise(new Error('SplitViewContext not found'));
