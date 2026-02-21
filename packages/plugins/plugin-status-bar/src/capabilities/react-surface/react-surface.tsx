//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/status-bar`,
        role: 'status-bar',
        component: () => <StatusBarPanel />,
      }),
      Surface.create({
        id: `${meta.id}/status-bar--r0-footer`,
        role: 'status-bar--r0-footer',
        component: () => <Surface.Surface role='status' />,
      }),
      Surface.create({
        id: `${meta.id}/status-bar--r1-footer`,
        role: 'status-bar--r1-footer',
        component: () => <StatusBarActions />,
      }),
      Surface.create({
        id: `${meta.id}/header-end`,
        role: 'header-end',
        component: () => <VersionNumber />,
      }),
    ]),
  ),
);
