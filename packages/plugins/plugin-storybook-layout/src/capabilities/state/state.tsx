//
// Copyright 2025 DXOS.org
//

import { Common, Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../../meta';
import { LayoutState } from '../../types';

const defaultState: LayoutState = {
  sidebarState: 'closed',
  complementarySidebarState: 'closed',
  dialogOpen: false,
  workspace: 'default',
};

export default Capability.makeModule(({ initialState }: { initialState?: Partial<LayoutState> }) => {
  const state = live<LayoutState>({ ...defaultState, ...initialState });

  const layout = live<Common.Capability.Layout>({
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

  return [Capability.contributes(LayoutState, state), Capability.contributes(Common.Capability.Layout, layout)];
});
