//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Node } from '@dxos/plugin-graph';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const layoutAtom = Atom.make<AppCapabilities.Layout>({
      mode: 'mail',
      dialogOpen: false,
      sidebarOpen: false,
      complementarySidebarOpen: false,
      workspace: Node.RootId,
      active: [],
      inactive: [],
      scrollIntoView: undefined,
    });
    return Capability.contributes(AppCapabilities.Layout, layoutAtom);
  }),
);
