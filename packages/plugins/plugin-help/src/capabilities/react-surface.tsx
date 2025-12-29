//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';

import { SHORTCUTS_DIALOG, ShortcutsDialogContent, ShortcutsHints, ShortcutsList } from '../components';
import { meta } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/hints`,
      role: 'hints',
      component: () => <ShortcutsHints />,
    }),
    Common.createSurface({
      id: `${meta.id}/keyshortcuts`,
      role: 'keyshortcuts',
      component: () => <ShortcutsList />,
    }),
    Common.createSurface({
      id: SHORTCUTS_DIALOG,
      role: 'dialog',
      filter: (data): data is { component: string } => data.component === SHORTCUTS_DIALOG,
      component: () => <ShortcutsDialogContent />,
    }),
  ]),
);
