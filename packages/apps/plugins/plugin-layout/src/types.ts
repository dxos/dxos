//
// Copyright 2023 DXOS.org
//

import type { Node } from '@braneframe/plugin-graph';
import type { Layout } from '@dxos/app-framework';

export const LAYOUT_PLUGIN = 'dxos.org/plugin/layout';

const LAYOUT_ACTION = `${LAYOUT_PLUGIN}/action`;
export enum LayoutAction {
  TOGGLE_FULLSCREEN = `${LAYOUT_ACTION}/toggle-fullscreen`,
  TOGGLE_SIDEBAR = `${LAYOUT_ACTION}/toggle-sidebar`,
  OPEN_DIALOG = `${LAYOUT_ACTION}/open-dialog`,
  CLOSE_DIALOG = `${LAYOUT_ACTION}/close-dialog`,
  ACTIVATE = `${LAYOUT_ACTION}/activate`,
}

export type LayoutState = Layout & {
  activeNode: Node | undefined;
  previousNode: Node | undefined;
};
