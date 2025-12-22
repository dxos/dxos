//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineCapabilityModule } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/react';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '../components';
import { meta } from '../meta';

export default defineCapabilityModule(() =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/status-bar`,
      role: 'status-bar',
      component: () => <StatusBarPanel />,
    }),
    createSurface({
      id: `${meta.id}/status-bar--r0-footer`,
      role: 'status-bar--r0-footer',
      component: () => <Surface role='status' />,
    }),
    createSurface({
      id: `${meta.id}/status-bar--r1-footer`,
      role: 'status-bar--r1-footer',
      component: () => <StatusBarActions />,
    }),
    createSurface({
      id: `${meta.id}/header-end`,
      role: 'header-end',
      component: () => <VersionNumber />,
    }),
  ]));
