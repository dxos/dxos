//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { RoutineNamespace } from './src/namespace.ts';
import * as RoutineCapabilities from './src/types/RoutineCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: RoutineNamespace.key,
    name: 'Routine',
    author: 'DXOS',
    description: trim`
      Event-driven workflow automation engine for DXOS Composer.
      A Routine pairs a trigger ("when" — a timer schedule or an incoming feed) with an action
      ("then" — a persistent compute operation and instructions), enabling automated pipelines that
      react to changes in real time without manual intervention.

      Routines are configured in their own article. A per-space TriggerDispatcher manages
      execution: running each trigger locally in the browser, or delegating it to the DXOS edge for
      server-side reliability when the trigger's "remote" flag is set; the space settings page toggles
      trigger execution for the whole space.

      Operation handlers and skills contributed by any plugin in the application are
      automatically merged and made available to every space's OperationRegistry, so new
      capabilities registered by other plugins become instantly invocable from routines.
    `,
    icon: { key: 'ph--atom--regular' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-routine',
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    // TODO(wittjosiah): Could some of these commands make use of operations?
    AppCapability.commands(() => import('./src/capabilities/commands.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri'],
    }),
    // The entry carries a live `customPanel` (`CreateRoutinePanel`) alongside the object factory, so the
    // module cannot be evaluated without React.
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
    // Dependency-mode: the specs resolve services (client, database, ...) lazily at
    // slice-materialisation time, so activation needs nothing — and providing
    // Capabilities.LayerSpec soft-orders this module before the process-manager snapshot.
    AppCapability.layerSpec(() => import('./src/capabilities/layer-specs.ts', { with: { type: 'module-url' } }), {
      environments: ['browser', 'node', 'tauri'],
      name: 'LayerSpecs',
      provides: [Capabilities.TraceSink],
    }),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: RoutineNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
    }),
    Capability.lazyModule(
      'RegistrySync',
      {
        requires: [
          ClientCapabilities.Client,
          Capabilities.AtomRegistry,
          AppCapabilities.SkillDefinition,
          Capabilities.OperationHandler,
        ],
        provides: [],
        environments: ['browser', 'node', 'tauri'],
      },
      () => import('./src/capabilities/registry-sync.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    // CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
    // provider must be present wherever the handler is exported.
    Capability.lazyModule(
      'Templates',
      { provides: [RoutineCapabilities.Template], environments: ['browser', 'node', 'tauri', 'workerd'] },
      () => import('./src/capabilities/templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'TriggerRuntimeController',
      {
        requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
        provides: [],
        // Runtime event: triggers only need to react to spaces once the client observes them.
        activatesOn: ClientEvents.SpacesAvailable,
        environments: ['browser', 'node', 'tauri'],
      },
      () => import('./src/capabilities/trigger-runtime-controller.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
