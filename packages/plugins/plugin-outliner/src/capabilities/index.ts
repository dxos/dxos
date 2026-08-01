//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { SpaceCapability } from '@dxos/plugin-space';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.dialog', 'org.dxos.role.section'],
});
