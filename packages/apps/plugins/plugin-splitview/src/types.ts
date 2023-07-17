//
// Copyright 2023 DXOS.org
//

import type { DeepSignal } from 'deepsignal';

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';

export const SPLITVIEW_PLUGIN = 'dxos:splitview';

export enum SplitViewAction {
  TOGGLE_SIDEBAR = `${SPLITVIEW_PLUGIN}:toggle-sidebar`,
}

export type SplitViewContextValue = DeepSignal<{
  sidebarOpen: boolean;
  dialogContent: any;
  dialogOpen: boolean;
}>;

export type SplitViewProvides = GraphProvides &
  IntentProvides & {
    splitView: SplitViewContextValue;
  };
