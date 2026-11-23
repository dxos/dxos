//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { trim } from '@dxos/util';

import { LinearNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: LinearNamespace.key,
    name: 'Linear',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-linear',
    spec: 'PLUGIN.mdl',
    description: trim`
    Integrates Linear into DXOS Composer, mirroring teams, projects, and issues as
    local-first objects that stay available alongside everything else in the workspace.
    The user selects Linear teams; the plugin pulls each team's projects as Project
    objects and its issues as Task objects keyed by their remote ids.

    Sync is bidirectional. The pull phase applies a snapshot-driven three-way merge
    per field: remote edits to untouched fields flow in, local edits to untouched
    fields are preserved, and on conflict the remote wins. The push phase diffs every
    locally-mirrored object against its snapshot and sends only the diverged fields,
    so read-only syncs produce no network traffic. Workflow states are fetched lazily
    and only when a status-change push is detected.

    Priority and status values are mapped through Linear's stable numeric codes and
    category constants rather than workspace-customisable display names, so renamed
    states continue to work. SyncOptions.maxDaysBack can limit how far back issues
    are pulled to keep initial syncs fast for large teams.

    Creating new local issues on Linear is not supported in v1; push covers edits to
    already-synced objects only. Per-target errors are isolated so a failure on one
    team does not prevent other teams from syncing.
  `,
    icon: { key: 'ph--list-checks--regular', hue: 'green' },
    tags: ['labs', 'connector'],
  },
  modules: [
    Capability.lazyModule(
      'LinearConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: LinearNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
