//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { type SimpleLayoutState } from '../../types';
import { SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

const defaultState: SimpleLayoutState = {
  dialogOpen: false,
  workspace: 'default',
  previousWorkspace: 'default',
  isPopover: false,
};

export type SimpleLayoutStateOptions = {
  initialState?: Partial<SimpleLayoutState>;
};

export default Capability.makeModule(({ initialState }: SimpleLayoutStateOptions = {}) =>
  Effect.sync(() => {
    const state = live<SimpleLayoutState>({ ...defaultState, ...initialState });

    const layout = live<Common.Capability.Layout>({
      get mode() {
        return 'simple';
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

    return [
      Capability.contributes(SimpleLayoutStateCapability, state),
      Capability.contributes(Common.Capability.Layout, layout),
    ];
  }),
);
