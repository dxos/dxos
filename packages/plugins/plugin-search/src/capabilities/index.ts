//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
// Idle by default; browser-only since what it fetches is a React chunk.
export const Preload = Capability.lazyModule(
  'Preload',
  { provides: [], environments: ['browser', 'tauri'] },
  () => import('./preload.ts'),
);
const SURFACE_ROLES = ['org.dxos.role.deckCompanion.search', 'org.dxos.role.dialog', 'org.dxos.role.searchInput'];
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: SURFACE_ROLES,
  // Also at idle: on desktop nothing requests these roles before the first search, which would
  // otherwise wait on this module's chunk as well as the dialog's.
  activatesOn: ActivationEvent.oneOf(
    ...SURFACE_ROLES.map((role) => ActivationEvents.SurfacesRequested(role)),
    ActivationEvents.Idle,
  ),
});
export const Translations = AppCapability.translations(translations);
