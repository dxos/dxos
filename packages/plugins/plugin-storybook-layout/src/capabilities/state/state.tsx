//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { LayoutState } from '../../types';

const defaultState: LayoutState = {
  sidebarState: 'closed',
  complementarySidebarState: 'closed',
  dialogOpen: false,
  workspace: 'default',
};

export default Capability.makeModule(({ initialState }: { initialState?: Partial<LayoutState> }) =>
  Effect.sync(() => {
    const stateAtom = Atom.make<LayoutState>({ ...defaultState, ...initialState }).pipe(Atom.keepAlive);

    const layoutAtom = Atom.make((get) => {
      const state = get(stateAtom);
      return {
        get mode() {
          return 'storybook' as const;
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
      } satisfies Common.Capability.Layout;
    }).pipe(Atom.keepAlive);

    return [
      Capability.contributes(LayoutState, stateAtom),
      Capability.contributes(Common.Capability.Layout, layoutAtom),
    ];
  }),
);
