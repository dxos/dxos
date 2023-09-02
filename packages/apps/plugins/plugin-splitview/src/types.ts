//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const SPLITVIEW_PLUGIN = 'dxos.org/plugin/splitview';

const SPLITVIEW_ACTION = `${SPLITVIEW_PLUGIN}/action`;
export enum SplitViewAction {
  TOGGLE_SIDEBAR = `${SPLITVIEW_ACTION}/toggle-sidebar`,
}

export type SplitViewState = {
  sidebarOpen?: boolean;
  complementarySidebarOpen?: boolean;
  dialogContent?: any;
  dialogOpen?: boolean;
  popoverContent?: any;
  popoverOpen?: boolean;
  popoverAnchorId?: string;
};

export type SplitViewProvides = GraphProvides &
  TranslationsProvides &
  IntentProvides & {
    splitView: SplitViewState;
  };
