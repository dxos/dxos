//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/react';

import { StatusBarActions, StatusBarPanel, VersionNumber } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/status-bar`,
      role: 'status-bar',
      component: () => <StatusBarPanel />,
    }),
    Common.createSurface({
      id: `${meta.id}/status-bar--r0-footer`,
      role: 'status-bar--r0-footer',
      component: () => <Surface role='status' />,
    }),
    Common.createSurface({
      id: `${meta.id}/status-bar--r1-footer`,
      role: 'status-bar--r1-footer',
      component: () => <StatusBarActions />,
    }),
    Common.createSurface({
      id: `${meta.id}/header-end`,
      role: 'header-end',
      component: () => <VersionNumber />,
    }),
  ]),
);
