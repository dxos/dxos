//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as shellTranslations } from '@dxos/shell/translations';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export * from './app-graph-builder/index.ts';
export * from './settings-sync/index.ts';
export { makeCreateObjectEntryForDatabaseType } from '../util/index.ts';

export { Commands } from './commands.ts';
export { CreateObject } from './create-object.ts';
export { Dashboard } from './dashboard.ts';
export { IdentityCreated } from './identity-created.ts';
export { NavigationHandler } from './navigation-handler/index.ts';
export type { NavigationHandlerOptions } from './navigation-handler/index.ts';
export { NavigationTargetResolver } from './navigation-target-resolver.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { Repair } from './repair.ts';
export { Schema } from './schema.ts';
export { SpaceSettings } from './settings.ts';
// Browser-only: it requires the app graph, layout and attention — app-shell capabilities no
// headless host registers.
export { SpacesAvailable } from './spaces-available.ts';
export { SkillDefinition } from './skill-definition.ts';
// Holds view state (space names, viewers, merge preview); every consumer — the React surfaces,
// the app-graph builder, `SpacesAvailable` — is itself browser-only.
export { SpaceState } from './state.ts';
export { ObservabilityMappings } from './observability-mappings.ts';
export { UndoMappings } from './undo-mappings.ts';
export const Translations = AppCapability.translations([
  ...translations,
  ...componentsTranslations,
  ...formTranslations,
  ...shellTranslations,
]);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
