//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Node } from '@dxos/plugin-graph';

import { type SimpleLayoutState } from '../../types';
import { SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

const defaultState: SimpleLayoutState = {
  dialogOpen: false,
  workspace: Node.RootId,
  previousWorkspace: Node.RootId,
  history: [],
  isPopover: false,
  companionVariant: undefined,
  drawerState: 'closed',
};

export type SimpleLayoutStateOptions = {
  initialState?: Partial<SimpleLayoutState>;
};

export default Capability.makeModule(({ initialState }: SimpleLayoutStateOptions = {}) =>
  Effect.sync(() => {
    const stateAtom = Atom.make<SimpleLayoutState>({ ...defaultState, ...initialState });

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
      Capability.contributes(SimpleLayoutStateCapability, stateAtom),
      Capability.contributes(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);
