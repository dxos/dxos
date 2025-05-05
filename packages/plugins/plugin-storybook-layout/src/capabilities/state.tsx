//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, defineCapability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

export type LayoutState = {
  popoverContent?: any;
  popoverOpen?: boolean;
  popoverSide?: 'top' | 'right' | 'bottom' | 'left';
  popoverVariant?: 'virtual' | 'react';
  popoverAnchor?: HTMLButtonElement;
  popoverAnchorId?: string;
};
export const LayoutState = defineCapability<LayoutState>('dxos.org/plugin/storybook-layout/state');

export default () => {
  const state = live<LayoutState>({});

  const layout = live<Capabilities.Layout>({
    get mode() {
      return 'storybook';
    },
    get dialogOpen() {
      return false;
    },
    get sidebarOpen() {
      return false;
    },
    get complementarySidebarOpen() {
      return false;
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
