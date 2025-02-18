//
// Copyright 2024 DXOS.org
//

import React from 'react';

import {
  Capabilities,
  contributes,
  createSurface,
  defineModule,
  definePlugin,
  Events,
  Surface,
} from '@dxos/app-framework';

import { StatusBarActions, StatusBarPanel } from './components';
import { VersionNumber } from './components/VersionNumber';
import { meta, STATUS_BAR_PLUGIN } from './meta';
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
      activatesOn: Events.SetupSurfaces,
      activate: () =>
        contributes(Capabilities.ReactSurface, [
          createSurface({
            id: meta.id,
            role: 'status-bar',
            component: () => <StatusBarPanel />,
          }),
          createSurface({
            id: meta.id,
            role: 'status-bar--r0-footer',
            component: () => <Surface role='status' />,
          }),
          createSurface({
            id: meta.id,
            role: 'status-bar--r1-footer',
            component: () => <StatusBarActions />,
          }),
          createSurface({
            id: `${STATUS_BAR_PLUGIN}/header-end`,
            role: 'header-end',
            component: () => <VersionNumber />,
          }),
        ]),
    }),
  ]);
