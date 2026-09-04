//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as shellTranslations } from '@dxos/shell/translations';

import { meta } from '#meta';
import { translations } from '#translations';
import { SpaceCapabilities, SpaceCapability, SpaceSchema } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';
import { SpaceOperationConfig } from '../operations/helpers';
import { makeCreateInvitationUrl } from './helpers';

export * from './app-graph-builder';
export { makeCreateObjectEntryForDatabaseType } from '../util';

export const Commands = AppCapability.commands(() => import('./commands'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: ['node'],
});
export const Dashboard = Capability.lazyModule(
  'Dashboard',
  {
    environments: [],
    requires: [
      Capabilities.AtomRegistry,
      Capabilities.PluginManager,
      ClientCapabilities.Client,
      AppCapabilities.Layout,
    ],
    provides: [SpaceCapabilities.Dashboard],
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./dashboard'),
);
export const IdentityCreated = Capability.lazyModule(
  'IdentityCreated',
  {
    // `SchemaRegistered` pulls the idle-gated schema registration into this wave; the root
    // collection is a typed object.
    requires: [ClientCapabilities.Client, ClientCapabilities.SchemaRegistered],
    provides: [SpaceCapabilities.DefaultSpace],
    // Runtime event: the default space is created when a local identity is created, not at startup.
    activatesOn: ClientEvents.IdentityCreated,
    environments: ['node'],
  },
  () => import('./identity-created'),
);
export { NavigationHandler } from './navigation-handler';
export type { NavigationHandlerOptions } from './navigation-handler';
export const NavigationTargetResolver = AppCapability.navigationResolver(() => import('./navigation-target-resolver'), {
  requires: [ClientCapabilities.Client],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
    'org.dxos.plugin.space.role.homeContent',
    'org.dxos.role.article',
    'org.dxos.role.dialog',
    'org.dxos.role.formInput',
    'org.dxos.role.navbarEnd',
    'org.dxos.role.navtreeItemEnd',
    'org.dxos.role.objectProperties',
    'org.dxos.role.popover',
    'org.dxos.role.section',
    'org.dxos.role.statusIndicator',
  ],
  props: (options: SpaceSchema.SpacePluginOptions) => ({ createInvitationUrl: makeCreateInvitationUrl(options) }),
});
export const Repair = Capability.lazyModule(
  'Repair',
  {
    provides: [SpaceCapabilities.Repair],
    // Runtime event: repairs run once spaces are observed, not at startup.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./repair'),
);
export const Schema = AppCapability.schema(() => import('./schema'));
export const SettingsSync = Capability.lazyModule(
  'SettingsSync',
  {
    requires: [ClientCapabilities.Client, Capabilities.PluginManager, Capabilities.AtomRegistry],
    provides: [AppCapabilities.SettingsSync],
    // Runtime event: the settings space this projects into arrives with the space list, not at startup.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./settings-sync'),
);
export const SpaceSettings = AppCapability.settings(() => import('./settings'), {
  provides: [SpaceCapabilities.SettingsAtom],
});
// Browser-only: it requires the app graph, layout and attention — app-shell capabilities no
// headless host registers.
export const SpacesReady = Capability.lazyModule(
  'SpacesReady',
  {
    environments: [],
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.AppGraph,
      Capabilities.AtomRegistry,
      AppCapabilities.Layout,
      AttentionCapabilities.Attention,
      SpaceCapabilities.State,
      SpaceCapabilities.EphemeralState,
      ClientCapabilities.Client,
      ClientCapabilities.IdentityService,
    ],
    provides: [],
    // Runtime event: spaces become ready when the client observes them, not at startup.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./spaces-ready'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
// Holds view state (space names, viewers, merge preview); every consumer — the React surfaces,
// the app-graph builder, `SpacesReady` — is itself browser-only.
export const SpaceState = Capability.lazyModule(
  'SpaceState',
  {
    requires: [Capabilities.AtomRegistry, Capabilities.PluginManager],
    provides: [SpaceCapabilities.State, SpaceCapabilities.EphemeralState],
    environments: [],
  },
  () => import('./state'),
);
export const ObservabilityMappings = AppCapability.observabilityMappings(() => import('./observability-mappings'), {
  props: (options: SpaceSchema.SpacePluginOptions) => ({ observability: options.observability }),
});
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'), {
  environments: ['node'],
  provides: [SpaceOperationConfig],
  props: (options: SpaceSchema.SpacePluginOptions) => ({
    createInvitationUrl: makeCreateInvitationUrl(options),
  }),
});
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
