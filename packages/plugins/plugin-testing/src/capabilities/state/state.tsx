//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

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

    const layoutAtom = Atom.make((get): AppCapabilities.Layout => {
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

    return [Capability.contributes(LayoutState, stateAtom), Capability.contributes(AppCapabilities.Layout, layoutAtom)];
  }),
);
