//
// Copyright 2023 DXOS.org
//

import type { Node } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const SPLITVIEW_PLUGIN = 'dxos.org/plugin/splitview';

const SPLITVIEW_ACTION = `${SPLITVIEW_PLUGIN}/action`;
export enum SplitViewAction {
  TOGGLE_FULLSCREEN = `${SPLITVIEW_ACTION}/toggle-fullscreen`,
  TOGGLE_SIDEBAR = `${SPLITVIEW_ACTION}/toggle-sidebar`,
  OPEN_DIALOG = `${SPLITVIEW_ACTION}/open-dialog`,
  CLOSE_DIALOG = `${SPLITVIEW_ACTION}/close-dialog`,
  ACTIVATE = `${SPLITVIEW_ACTION}/activate`,
}

export type SplitViewState = {
  fullscreen?: boolean;
  sidebarOpen?: boolean;
  complementarySidebarOpen?: boolean;
  dialogContent?: any;
  dialogOpen?: boolean;
  popoverContent?: any;
  popoverOpen?: boolean;
  popoverAnchorId?: string;
  active: string | undefined;
  previous: string | undefined;
  activeNode: Node | undefined;
  previousNode: Node | undefined;
};

export type SplitViewPluginProvides = TranslationsProvides &
  IntentProvides & {
    splitView: SplitViewState;
  };
