//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { DoctorCapabilities, DoctorEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const DiagnosticProviders = Capability.lazyModule(
  'DiagnosticProviders',
  { provides: [DoctorCapabilities.DiagnosticProvider], activatesOn: DoctorEvents.Start },
  () => import('./diagnostic-providers.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.deckCompanion.diagnostics'],
});
export const Translations = AppCapability.translations(translations);
