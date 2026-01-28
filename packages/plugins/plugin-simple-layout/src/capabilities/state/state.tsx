//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { type SimpleLayoutState } from '../../types';
import { SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

export const HOME_ID = 'home';

const defaultState: SimpleLayoutState = {
  dialogOpen: false,
  workspace: HOME_ID,
  previousWorkspace: HOME_ID,
  isPopover: false,
};

export type SimpleLayoutStateOptions = {
  initialState?: Partial<SimpleLayoutState>;
};

export default Capability.makeModule(({ initialState }: SimpleLayoutStateOptions = {}) =>
  Effect.sync(() => {
    const stateAtom = Atom.make<SimpleLayoutState>({ ...defaultState, ...initialState });

    const layoutAtom = Atom.make((get): Common.Capability.Layout => {
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
      Capability.contributes(Common.Capability.Layout, layoutAtom),
    ];
  }),
);
