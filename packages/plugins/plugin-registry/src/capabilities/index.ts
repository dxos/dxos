//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '#translations';

export { RegistryAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { DevPluginLoader } from './dev-plugin-loader.ts';
export const Commands = AppCapability.lazyCommands(() => import('#commands'));
export { OperationHandler } from './operation-handler.ts';
export { SkillDefinition } from './skill-definition.ts';
export { ReactSurface } from './react-surface.ts';
export { RegistrySettings } from './settings.ts';
export const Translations = AppCapability.translations(translations);
