//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';

export type LayoutState = {
  sidebarState?: 'expanded' | 'collapsed' | 'closed';
  complementarySidebarState?: 'expanded' | 'collapsed' | 'closed';

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
};
export const LayoutState = Capability.make<LayoutState>(`${meta.id}/state`);

const defaultState: LayoutState = {
  sidebarState: 'closed',
  complementarySidebarState: 'closed',
  dialogOpen: false,
  workspace: 'default',
};

export default Capability.makeModule(({ initialState }: { initialState?: Partial<LayoutState> }) => {
  const state = live<LayoutState>({ ...defaultState, ...initialState });

  const layout = live<Capabilities.Layout>({
    get mode() {
      return 'storybook';
    },
    get dialogOpen() {
      return state.dialogOpen;
    },
    get sidebarOpen() {
      return state.sidebarState === 'expanded';
    },
    get complementarySidebarOpen() {
      return state.complementarySidebarState === 'expanded';
    },
    get workspace() {
      return state.workspace;
    },
    get active() {
      return [];
    },
    get inactive() {
      return [];
    },
    get scrollIntoView() {
      return undefined;
    },
  });

  return [Capability.contributes(LayoutState, state), Capability.contributes(Capabilities.Layout, layout)];
});
