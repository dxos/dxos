//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

export type LayoutState = {
  sidebarState?: 'expanded' | 'collapsed' | 'closed';
  complementarySidebarState?: 'expanded' | 'collapsed' | 'closed';
  popoverContent?: any;
  popoverOpen?: boolean;
  popoverSide?: 'top' | 'right' | 'bottom' | 'left';
  popoverVariant?: 'virtual' | 'react';
  popoverAnchor?: HTMLButtonElement;
  popoverAnchorId?: string;
};
export const LayoutState = defineCapability<LayoutState>('dxos.org/plugin/storybook-layout/state');

const defaultState: LayoutState = {
  sidebarState: 'closed',
  complementarySidebarState: 'closed',
};

export default ({ initialState = defaultState }: { initialState?: LayoutState }) => {
  const state = live<LayoutState>(initialState);

  const layout = live<Capabilities.Layout>({
    get mode() {
      return 'storybook';
    },
    get dialogOpen() {
      return false;
    },
    get sidebarOpen() {
      return state.sidebarState === 'expanded';
    },
    get complementarySidebarOpen() {
      return state.complementarySidebarState === 'expanded';
    },
    get workspace() {
      return 'default';
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

  return [contributes(LayoutState, state), contributes(Capabilities.Layout, layout)];
};
