//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as GitHubCapabilities from '@dxos/plugin-github/GitHubCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { meta } from '#meta';
import { translations } from '#translations';
import { CodeCapabilities, CodeEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
export const McpServer = AppCapability.mcpServer(() => import('./mcp-server.ts'));
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const BuildRunState = Capability.lazyModule(
  'BuildRunState',
  { provides: [CodeCapabilities.BuildRun], activatesOn: CodeEvents.Start },
  () => import('./build-run-state.ts'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'));
// Eager, as every migration provider is: a migration missing when a space opens is a data hazard.
export const Migrations = Capability.lazyModule(
  'CodeMigrations',
  { provides: [ClientCapabilities.Migration] },
  () => import('./migrations.ts'),
);
export const NavigationTargetResolver = AppCapability.navigationResolver(
  () => import('./navigation-target-resolver.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Settings = AppCapability.settings(() => import('./settings.ts'), {
  activatesOn: ActivationEvents.Idle,
  provides: [CodeCapabilities.Settings],
});
export const Translations = AppCapability.translations(translations);
// Registered at startup so a GitHub file sync on EDGE, where no UI event fires, finds the mapping.
export const SpecFileMapping = Capability.lazyModule(
  'SpecFileMapping',
  { provides: [GitHubCapabilities.FileMapping], activatesOn: ActivationEvents.Startup },
  () => import('./spec-file-mapping.ts'),
);
// Local files are reachable only from the desktop app or a dev server; settings supply the configured checkouts.
export const SpecSync = Capability.lazyModule(
  'SpecSync',
  {
    requires: [ClientCapabilities.Client, CodeCapabilities.Settings, Capabilities.AtomRegistry],
    provides: [CodeCapabilities.SpecSync],
    environments: ['browser', 'tauri'],
  },
  () => import('./spec-sync.ts'),
);
