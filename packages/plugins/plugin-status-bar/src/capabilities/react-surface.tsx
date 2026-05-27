//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { DXN } from '@dxos/keys';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.statusBar.surface.statusBar'),
        role: 'status-bar',
        component: () => <StatusBarPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.statusBar.surface.statusBarR1Footer'),
        role: 'status-bar--r1-footer',
        component: () => <StatusBarActions />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.statusBar.surface.versionInfo'),
        role: 'version-info',
        component: () => <VersionNumber />,
      }),
    ]),
  ),
);
