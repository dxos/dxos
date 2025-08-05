//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, type PluginContext, contributes, createSurface } from '@dxos/app-framework';

import { ThemeEditor } from '../components';
import { THEME_EDITOR_PLUGIN } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${THEME_EDITOR_PLUGIN}/theme-editor`,
      role: 'article',
      filter: (data): data is { subject: string } => data.subject === `${THEME_EDITOR_PLUGIN}/theme-editor`,
      component: () => <ThemeEditor />,
    }),
  ]);
