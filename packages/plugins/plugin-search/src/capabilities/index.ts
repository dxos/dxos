//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { SearchEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: SearchEvents.Start,
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: SearchEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: SearchEvents.Start,
});
