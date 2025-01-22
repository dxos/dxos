//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { SHORTCUTS_DIALOG, ShortcutsDialogContent, ShortcutsHints, ShortcutsList } from '../components';
import { HELP_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${HELP_PLUGIN}/hints`,
      role: 'hints',
      component: () => <ShortcutsHints />,
    }),
    createSurface({
      id: `${HELP_PLUGIN}/keyshortcuts`,
      role: 'keyshortcuts',
      component: () => <ShortcutsList />,
    }),
    createSurface({
      id: SHORTCUTS_DIALOG,
      role: 'dialog',
      filter: (data): data is any => data.component === SHORTCUTS_DIALOG,
      component: () => <ShortcutsDialogContent />,
    }),
  ]);
