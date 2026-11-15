//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { LayoutState } from '../DiagramAppCapabilities.ts';
import { parseRoute } from '../model/index.ts';

/** One diagram, nothing else open: plugins that read the layout see a single-item workspace with no sidebars. */
export default Capability.makeModule(() =>
  Effect.sync(() => {
    const state = Atom.make<LayoutState>({
      route: parseRoute(window.location.pathname),
      dialogOpen: false,
      dialogType: 'default',
      dialogDismissals: 0,
      popoverOpen: false,
      popoverKind: 'base',
      toasts: [],
      workspace: 'default',
    }).pipe(Atom.keepAlive);

    const layout = Atom.make((get): AppCapabilities.Layout => {
      const { dialogOpen, workspace } = get(state);
      return {
        mode: 'diagram',
        dialogOpen,
        sidebarOpen: false,
        complementarySidebarOpen: false,
        workspace,
        active: [],
        inactive: [],
        scrollIntoView: undefined,
      };
    });

    return [Capability.contribute(LayoutState, state), Capability.contribute(AppCapabilities.Layout, layout)];
  }),
);
