//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';

// TODO(wittjosiah): Handle toasts.
export type MobileLayoutState = {
  dialogOpen: boolean;
  dialogType?: 'default' | 'alert';
  dialogBlockAlign?: 'start' | 'center' | 'end';
  dialogOverlayClasses?: string;
  dialogOverlayStyle?: Record<string, any>;
  /** Data to be passed to the dialog Surface. */
  dialogContent?: any;

  popoverOpen?: boolean;
  popoverSide?: 'top' | 'right' | 'bottom' | 'left';
  popoverVariant?: 'virtual' | 'react';
  popoverAnchor?: HTMLButtonElement;
  popoverAnchorId?: string;
  popoverContent?: any;

  workspace: string;
  previousWorkspace: string;
  active?: string;
};
export const MobileLayoutState = defineCapability<MobileLayoutState>(`${meta.id}/state`);

const defaultState: MobileLayoutState = {
  dialogOpen: false,
  workspace: 'default',
  previousWorkspace: 'default',
};

export default ({ initialState }: { initialState?: Partial<MobileLayoutState> }) => {
  const state = live<MobileLayoutState>({ ...defaultState, ...initialState });

  const layout = live<Capabilities.Layout>({
    get mode() {
      return 'mobile';
    },
    get dialogOpen() {
      return state.dialogOpen;
    },
    get sidebarOpen() {
      return false;
    },
    get complementarySidebarOpen() {
      return false;
    },
    get workspace() {
      return state.workspace;
    },
    get active() {
      return state.active ? [state.active] : [];
    },
    get inactive() {
      return [];
    },
    get scrollIntoView() {
      return undefined;
    },
  });

  return [contributes(MobileLayoutState, state), contributes(Capabilities.Layout, layout)];
};
