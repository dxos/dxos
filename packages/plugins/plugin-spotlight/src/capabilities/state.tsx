//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphNode from '@dxos/graph/GraphNode';
import { COMMANDS_DIALOG } from '@dxos/plugin-navtree/meta';

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
        workspace: GraphNode.RootId,
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
