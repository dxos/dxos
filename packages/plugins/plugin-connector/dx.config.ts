//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { ConnectorNamespace } from './src/namespace.ts';
import * as ConnectorCoordination from './src/types/ConnectorCoordination.ts';
import * as ConnectorEvents from './src/types/ConnectorEvents.ts';
import * as ConnectorSpec from './src/types/ConnectorSpec.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ConnectorNamespace.key,
    name: 'Connections',
    author: 'DXOS',
    description: trim`
      Connects DXOS Composer workspaces to external services. A Connector is the
      reusable driver for a service; a Connection is the durable authenticated
      instance (a name, the connector id, and a Ref to an AccessToken stored in
      ECHO). One connector can back many connections (multi-account), and each
      connection sources one or more sync Cursors — a remote target paired with
      a local ECHO root object — that carry per-cursor sync state.

      Other plugins register themselves as Connector capability entries,
      describing their OAuth scopes, target-discovery and sync operations, how to
      materialize a target, and an optional credential form. The plugin renders a
      generic UI that adapts to whichever connectors are loaded: a connector
      picker (reuse an existing connection or create a new one), a sync-target
      checklist after authentication, and a Connection article that shows
      per-binding sync status.

      Authentication supports three paths: an OAuth popup flow (default), a
      redirect flow for providers that nullify window.opener (e.g. AT Protocol),
      and a custom-token or pre-flight form for non-OAuth credentials. Pending
      OAuth state is kept in memory and mirrored to localStorage so the redirect
      path can recover across tab boundaries.

      ECHO writes happen only after authentication succeeds: the AccessToken and
      Connection are persisted together, the connector's onTokenCreated hook
      fires, and Composer navigates to the new Connection. Cursor reconciliation
      is non-destructive, preserving existing sync cursors and options for
      targets that remain selected.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-connector',
    tags: ['system'],
    spec: 'PLUGIN.mdl',
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [ConnectorSpec.Connector],
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'BuiltinConnectors',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connectors.ts', { with: { type: 'module-url' } }),
    ),
    // `#commands` resolves to `commands.browser.ts` under the browser: `connector oauth` needs a Bun
    // callback server, so only headless runtimes get the real command graph.
    AppCapability.commands(() => import('#commands', { with: { type: 'module-url' } })),
    // Coordination drives an interactive OAuth flow through the shell, as does `OAuthRedirect`, which
    // requires it.
    Capability.lazyModule(
      'ConnectorCoordination.ConnectorCoordinator',
      {
        environments: ['browser', 'tauri'],
        requires: [
          ClientCapabilities.Client,
          ClientCapabilities.IdentityService,
          Capabilities.OperationInvoker,
          Capabilities.ServiceResolver,
        ],
        provides: [ConnectorCoordination.ConnectorCoordinator],
      },
      () =>
        import('./src/capabilities/connector-coordinator/connector-coordinator.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'OAuthRedirect',
      {
        requires: [ConnectorCoordination.ConnectorCoordinator],
        provides: [],
        activatesOn: ConnectorEvents.Start,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/oauth-redirect.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: ConnectorNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.Dialog],
    }),
    Capability.lazyModule(
      'RoutineTemplate',
      { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
      () => import('./src/capabilities/routine-template.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
