//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '#containers';

import { StatusBar, StatusBarFooter, VersionInfo } from '@dxos/plugin-deck';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'statusBar',
        filter: Surface.makeFilter(StatusBar),
        component: () => <StatusBarPanel />,
      }),
      Surface.create({
        id: 'statusBarFooter',
        filter: Surface.makeFilter(StatusBarFooter),
        component: () => <StatusBarActions />,
      }),
      Surface.create({
        id: 'versionInfo',
        filter: Surface.makeFilter(VersionInfo),
        component: () => <VersionNumber />,
      }),
    ]),
  ),
);
