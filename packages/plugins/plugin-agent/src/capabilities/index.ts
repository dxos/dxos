//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export const Brain = AppCapability.layerSpec(() => import('./brain.ts'), {
  name: 'Brain',
  environments: ['browser', 'node', 'tauri'],
});
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.tsx'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const Translations = AppCapability.translations(translations);
