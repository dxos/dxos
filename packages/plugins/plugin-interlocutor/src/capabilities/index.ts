//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
// The Discord bot operations call EDGE with the user's identity, which only the app's client provides.
export const DiscordOperationHandler = AppCapability.operationHandler(() => import('./discord-operation-handler.ts'), {
  // Module ids derive from the name, and a second module with the default name is dropped.
  name: 'DiscordOperationHandler',
  activatesOn: ActivationEvents.Idle,
  environments: ['browser', 'tauri'],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.tsx'), {
  roles: ['org.dxos.role.objectProperties'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const Translations = AppCapability.translations(translations);
