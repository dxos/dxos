//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Node } from '@dxos/plugin-graph';

import { SimpleLayoutCapabilities } from '#types';

const defaultState: SimpleLayoutCapabilities.SimpleLayoutState = {
  dialogOpen: false,
  workspace: Node.RootId,
  previousWorkspace: Node.RootId,
  history: [],
  isPopover: false,
  companionVariant: undefined,
  drawerState: 'closed',
};

export type SimpleLayoutStateOptions = {
  initialState?: Partial<SimpleLayoutCapabilities.SimpleLayoutState>;
};

export default Capability.makeModule(({ initialState }: SimpleLayoutStateOptions = {}) =>
  Effect.sync(() => {
    const stateAtom = Atom.make<SimpleLayoutCapabilities.SimpleLayoutState>({ ...defaultState, ...initialState });

    const layoutAtom = Atom.make((get): AppCapabilities.Layout => {
      const state = get(stateAtom);
      return {
        mode: 'simple',
        dialogOpen: state.dialogOpen,
        sidebarOpen: false,
        complementarySidebarOpen: false,
        workspace: state.workspace,
        active: state.active ? [state.active] : [],
        inactive: [],
        scrollIntoView: undefined,
      };
    });

    return [
      Capability.contribute(SimpleLayoutCapabilities.State, stateAtom),
      Capability.contribute(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);
