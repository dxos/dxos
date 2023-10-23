//
// Copyright 2023 DXOS.org
//

import type { Node } from '@braneframe/plugin-graph';
import type { Layout } from '@dxos/react-surface';

export const SPLITVIEW_PLUGIN = 'dxos.org/plugin/splitview';

const SPLITVIEW_ACTION = `${SPLITVIEW_PLUGIN}/action`;
export enum SplitViewAction {
  TOGGLE_FULLSCREEN = `${SPLITVIEW_ACTION}/toggle-fullscreen`,
  TOGGLE_SIDEBAR = `${SPLITVIEW_ACTION}/toggle-sidebar`,
  OPEN_DIALOG = `${SPLITVIEW_ACTION}/open-dialog`,
  CLOSE_DIALOG = `${SPLITVIEW_ACTION}/close-dialog`,
  ACTIVATE = `${SPLITVIEW_ACTION}/activate`,
}

export type LayoutState = Layout & {
  activeNode: Node | undefined;
  previousNode: Node | undefined;
};
