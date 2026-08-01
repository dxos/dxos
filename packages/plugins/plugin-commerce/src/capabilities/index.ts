//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { SpaceCapability } from '@dxos/plugin-space';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.Attention],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.objectProperties'],
});
