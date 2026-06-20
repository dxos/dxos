//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Node } from '@dxos/plugin-graph';

import { meta } from '#meta';

export type MailLayoutState = {
  /** Qualified path of the active workspace (e.g. `${RootId}/${spaceId}`). */
  workspace: string;
};

/** Writable mail layout state — `MailLayout` updates `workspace` once it resolves the personal space. */
export const MailLayoutState = Capability.make<Atom.Writable<MailLayoutState>>(`${meta.profile.key}.state`);

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = Atom.make<MailLayoutState>({ workspace: Node.RootId });

    const layoutAtom = Atom.make((get): AppCapabilities.Layout => {
      const state = get(stateAtom);
      return {
        mode: 'mail',
        dialogOpen: false,
        sidebarOpen: false,
        complementarySidebarOpen: false,
        workspace: state.workspace,
        active: [],
        inactive: [],
        scrollIntoView: undefined,
      };
    });

    return [
      Capability.contributes(MailLayoutState, stateAtom),
      Capability.contributes(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);
