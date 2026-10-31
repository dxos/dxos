//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { trim } from '@dxos/util';

import { SpaceNamespace } from './src/namespace.ts';
import { SpaceOperationConfig } from './src/operations/helpers.ts';
import * as SpaceCapabilities from './src/types/SpaceCapabilities.ts';
import * as SpaceCapability from './src/types/SpaceCapability.ts';
import * as SpaceSchema from './src/types/SpaceSchema.ts';

// Its own line in the module list, so composer-app's hot-reload demo (QA-16) can drop it with one edit.
const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  {
    // Browser-only: the builder defaults its share-link origin to `window.location.origin`, read
    // when the module activates.
    environments: ['browser', 'tauri'],
    provides: [AppCapabilities.AppGraphBuilder],
    // Its connectors read `client.spaces` inside atom computations (initialized-only, and a
    // pre-init throw is not re-evaluated when initialization lands).
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./src/capabilities/app-graph-builder/app-graph-builder.ts', { with: { type: 'module-url' } }),
);

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<SpaceSchema.SpacePluginOptions> = Plugin.config<SpaceSchema.SpacePluginOptions>({
  plugin: {
    key: SpaceNamespace.key,
    name: 'Spaces',
    author: 'DXOS',
    description: trim`
      SpacePlugin is the core workspace container for DXOS Composer. It owns the full lifecycle of
      collaborative spaces — creating, joining, opening, closing, and resetting them — and manages
      the membership and invitation system that controls who can access each space.

      The plugin maintains an ordered app-graph of every space and its collections, wires navigation
      so that opening a space or object updates the layout, and tracks real-time peer presence so
      that the UI can show which collaborators are viewing each object.

      Object and schema management sit at the heart of SpacePlugin: it registers the canonical DXOS
      schema types (Person, Task, Project, Event, …), provides the create-object dialog that all
      other plugins populate with their own types, and exposes operations for adding, removing,
      restoring, duplicating, and serialising objects. Import/export of space archives and schema
      migrations are also handled here.

      A full set of undo-aware operations (RemoveObjects/RestoreObjects, DeleteField/RestoreField)
      integrates with the process manager so that destructive edits can be reversed in one step.
    `,
    icon: { key: 'ph--planet--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
  modules: [
    AppGraphBuilder,
    // TODO(wittjosiah): Could some of these commands make use of operations?
    AppCapability.commands(() => import('./src/capabilities/commands.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri'],
    }),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'Dashboard',
      {
        environments: ['browser', 'tauri'],
        requires: [Capabilities.PluginManager, ClientCapabilities.Client, AppCapabilities.Layout],
        provides: [SpaceCapabilities.Dashboard],
        activatesOn: ClientEvents.SpacesAvailable,
      },
      () => import('./src/capabilities/dashboard.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.defaultParent(() => import('./src/capabilities/default-parent.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'IdentityCreated',
      {
        // `SchemaRegistered` pulls the idle-gated schema registration into this wave; the root
        // collection is a typed object.
        requires: [ClientCapabilities.Client, ClientCapabilities.SchemaRegistered],
        provides: [SpaceCapabilities.DefaultSpace],
        // Runtime event: the default space is created when a local identity is created, not at startup.
        activatesOn: ClientEvents.IdentityCreated,
        environments: ['browser', 'node', 'tauri'],
      },
      () => import('./src/capabilities/identity-created.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.navigationHandler(
      () => import('./src/capabilities/navigation-handler/navigation-handler.ts', { with: { type: 'module-url' } }),
      {
        requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
      },
    ),
    AppCapability.navigationResolver(
      () => import('./src/capabilities/navigation-target-resolver.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
        requires: [ClientCapabilities.Client],
      },
    ),
    AppCapability.observabilityMappings(
      () => import('./src/capabilities/observability-mappings.ts', { with: { type: 'module-url' } }),
      {},
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: SpaceNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.plugin.space.role.homeContent',
        'org.dxos.role.article',
        'org.dxos.role.cardMasonry',
        'org.dxos.role.dialog',
        'org.dxos.role.formInput',
        'org.dxos.role.navbarEnd',
        'org.dxos.role.navtreeItemEnd',
        'org.dxos.role.objectProperties',
        'org.dxos.role.popover',
        'org.dxos.role.section',
        'org.dxos.role.statusIndicator',
      ],
    }),
    Capability.lazyModule(
      'Repair',
      {
        provides: [SpaceCapabilities.Repair],
        // Runtime event: repairs run once spaces are observed, not at startup.
        activatesOn: ClientEvents.SpacesAvailable,
      },
      () => import('./src/capabilities/repair.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'SettingsSync',
      {
        requires: [ClientCapabilities.Client, Capabilities.PluginManager, Capabilities.AtomRegistry],
        provides: [AppCapabilities.SettingsSync],
        // The space list can be observable before the identity loads; the module waits for the identity before binding.
        activatesOn: ActivationEvent.oneOf(ClientEvents.SpacesAvailable, ClientEvents.IdentityCreated),
      },
      () => import('./src/capabilities/settings-sync/settings-sync.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    // Browser-only: it requires the app graph, layout and attention — app-shell capabilities no
    // headless host registers.
    Capability.lazyModule(
      'SpacesAvailable',
      {
        environments: ['browser', 'tauri'],
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
        activatesOn: ClientEvents.SpacesAvailable,
      },
      () => import('./src/capabilities/spaces-available.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [SpaceCapabilities.SettingsAtom],
    }),
    // Holds view state (space names, viewers, merge preview); every consumer — the React surfaces,
    // the app-graph builder, `SpacesAvailable` — is itself browser-only.
    Capability.lazyModule(
      'SpaceState',
      {
        requires: [Capabilities.AtomRegistry, Capabilities.PluginManager],
        provides: [SpaceCapabilities.State, SpaceCapabilities.EphemeralState],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/capabilities/translations.ts', { with: { type: 'module-url' } })),
    AppCapability.undoMappings(() => import('./src/capabilities/undo-mappings.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri'],
    }),
    Capability.lazyModule(
      'SpaceOperationConfig',
      { provides: [SpaceOperationConfig] },
      () => import('./src/capabilities/operation-config.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
