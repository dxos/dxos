//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineModule, definePlugin, Events } from '@dxos/app-framework';

import { StatusBarPanel } from './components';
import { meta } from './meta';
import translations from './translations';

export const StatusBarPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.Startup,
      activate: () =>
        contributes(Capabilities.ReactSurface, [
          createSurface({
            id: meta.id,
            role: 'status-bar',
            component: () => <StatusBarPanel />,
          }),
          createSurface({
            id: meta.id,
            role: 'status-bar--sidebar-footer',
            component: () => <StatusBarPanel variant='sidebar-footer' />,
          }),
        ]),
    }),
  ]);
