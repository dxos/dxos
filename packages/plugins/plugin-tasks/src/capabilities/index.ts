//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

// Narrower than the `appGraphBuilder` family default: its nodes invoke
// `LayoutOperation.UpdateDialog`, which means nothing without an app shell.
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  environments: [],
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'));
// Migration providers stay eager: a migration missing when a space opens is a data hazard.
export const Migrations = Capability.lazyModule(
  'TasksMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent', 'org.dxos.role.dialog', 'org.dxos.role.section'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Translations = AppCapability.translations(translations);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings.ts'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
