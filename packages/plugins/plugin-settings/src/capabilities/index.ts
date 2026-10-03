//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export const SettingsAppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  name: 'SettingsAppGraphBuilder',
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article'],
});
export const Translations = AppCapability.translations(translations);
