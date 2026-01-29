//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { LayoutState, type LayoutStateProps } from '../../types';

const defaultState: LayoutStateProps = {
  sidebarState: 'closed',
  complementarySidebarState: 'closed',
  dialogOpen: false,
  workspace: 'default',
};

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: { initialState?: Partial<LayoutStateProps> }) {
    const { initialState } = props ?? {};
    const stateAtom = Atom.make<LayoutStateProps>({ ...defaultState, ...initialState });

    const layoutAtom = Atom.make((get): Common.Capability.Layout => {
      const state = get(stateAtom);
      return {
        mode: 'storybook',
        dialogOpen: state.dialogOpen,
        sidebarOpen: state.sidebarState === 'expanded',
        complementarySidebarOpen: state.complementarySidebarState === 'expanded',
        workspace: state.workspace,
        active: [],
        inactive: [],
        scrollIntoView: undefined,
      };
    });

    return [
      Capability.contributes(LayoutState, stateAtom),
      Capability.contributes(Common.Capability.Layout, layoutAtom),
    ];
  }),
);
