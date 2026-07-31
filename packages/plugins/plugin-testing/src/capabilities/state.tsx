//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { StorybookCapabilities } from '#types';

const defaultState: StorybookCapabilities.LayoutStateProps = {
  sidebarState: 'closed',
  complementarySidebarState: 'closed',
  dialogOpen: false,
  toasts: [],
  workspace: 'default',
};

export default Capability.makeModule(
  Effect.fnUntraced(function* (props?: { initialState?: Partial<StorybookCapabilities.LayoutStateProps> }) {
    const { initialState } = props ?? {};
    const stateAtom = Atom.make<StorybookCapabilities.LayoutStateProps>({ ...defaultState, ...initialState });

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

    return [
      Capability.contribute(StorybookCapabilities.LayoutState, stateAtom),
      Capability.contribute(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);
