//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Node } from '@dxos/plugin-graph';
import { COMMANDS_DIALOG } from '@dxos/plugin-navtree';

import { SpotlightCapabilities } from '#types';

const defaultState: SpotlightCapabilities.SpotlightState = {
  dialogOpen: true,
  dialogContent: { component: COMMANDS_DIALOG },
};

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = Atom.make<SpotlightCapabilities.SpotlightState>({ ...defaultState });

    const layoutAtom = Atom.make((get): AppCapabilities.Layout => {
      const state = get(stateAtom);
      return {
        mode: 'spotlight',
        dialogOpen: state.dialogOpen,
        sidebarOpen: false,
        complementarySidebarOpen: false,
        workspace: Node.RootId,
        active: [],
        inactive: [],
        scrollIntoView: undefined,
      };
    });

    return [
      Capability.contribute(SpotlightCapabilities.State, stateAtom),
      Capability.contribute(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);
