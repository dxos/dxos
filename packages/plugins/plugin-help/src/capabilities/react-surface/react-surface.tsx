//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { SHORTCUTS_DIALOG } from '../../constants';
import { ShortcutsDialogContent, ShortcutsHints, ShortcutsList } from '../../containers';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/hints`,
        role: 'hints',
        component: () => <ShortcutsHints />,
      }),
      Surface.create({
        id: `${meta.id}/keyshortcuts`,
        role: 'keyshortcuts',
        component: () => <ShortcutsList />,
      }),
      Surface.create({
        id: SHORTCUTS_DIALOG,
        role: 'dialog',
        filter: (data): data is { component: string } => data.component === SHORTCUTS_DIALOG,
        component: () => <ShortcutsDialogContent />,
      }),
    ]),
  ),
);
