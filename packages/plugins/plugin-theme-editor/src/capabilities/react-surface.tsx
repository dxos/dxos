//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';

import { ThemeEditor } from '../components';
import { meta } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/theme-editor`,
      role: 'article',
      filter: (data): data is { subject: string } =>
        data.subject === `${meta.id}/theme-editor`,
      component: () => <ThemeEditor />,
    }),
  ]),
);
