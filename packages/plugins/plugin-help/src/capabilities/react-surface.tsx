//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, Capability, createSurface } from '@dxos/app-framework';

import { SHORTCUTS_DIALOG, ShortcutsDialogContent, ShortcutsHints, ShortcutsList } from '../components';
import { meta } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/hints`,
      role: 'hints',
      component: () => <ShortcutsHints />,
    }),
    createSurface({
      id: `${meta.id}/keyshortcuts`,
      role: 'keyshortcuts',
      component: () => <ShortcutsList />,
    }),
    createSurface({
      id: SHORTCUTS_DIALOG,
      role: 'dialog',
      filter: (data): data is any => data.component === SHORTCUTS_DIALOG,
      component: () => <ShortcutsDialogContent />,
    }),
  ]),
);
