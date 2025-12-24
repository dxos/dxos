//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineCapabilityModule } from '@dxos/app-framework';

import { ThemeEditor } from '../components';
import { meta } from '../meta';

export default defineCapabilityModule(() =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/theme-editor`,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${meta.id}/theme-editor`,
      component: () => <ThemeEditor />,
    }),
  ]),
);
