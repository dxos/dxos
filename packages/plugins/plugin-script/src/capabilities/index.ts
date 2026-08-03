//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { ScriptCapabilities, ScriptEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const Compiler = Capability.lazyModule(
  'Compiler',
  {
    provides: [ScriptCapabilities.Compiler],
    // Genuine runtime event: the compiler is only loaded on demand (`hooks/useCompiler.ts`), not at startup.
    activatesOn: ScriptEvents.SetupCompiler,
  },
  () => import('./compiler'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog', 'org.dxos.role.objectProperties', 'org.dxos.role.section'],
});
export const ScriptSettings = AppCapability.settings(() => import('./settings'), {
  provides: [ScriptCapabilities.Settings],
});
