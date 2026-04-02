//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Node } from '@dxos/plugin-graph';

import { type SpotlightState } from '../../types';
import { SpotlightState as SpotlightStateCapability } from '../../types';

/** Commands dialog surface identifier (from plugin-navtree). */
const COMMANDS_DIALOG = 'org.dxos.plugin.navtree.commands-dialog';

const defaultState: SpotlightState = {
  dialogOpen: true,
  dialogContent: { component: COMMANDS_DIALOG },
};

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = Atom.make<SpotlightState>({ ...defaultState });

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
      Capability.contributes(SpotlightStateCapability, stateAtom),
      Capability.contributes(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);
