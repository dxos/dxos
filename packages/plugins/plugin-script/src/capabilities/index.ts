//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { ScriptCapabilities, ScriptEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { ScriptAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { CreateObject } from './create-object.ts';
export const Compiler = Capability.makeLazyModule(
  'Compiler',
  {
    provides: [ScriptCapabilities.Compiler],
    // Genuine runtime event: the compiler is only loaded on demand (`hooks/useCompiler.ts`), not at startup.
    activatesOn: ScriptEvents.SetupCompiler,
  },
  () => import('./compiler.ts'),
);
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { ScriptSettings } from './settings.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
