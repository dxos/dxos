//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantEvents from '@dxos/plugin-assistant/AssistantEvents';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import * as TasksCapabilities from '@dxos/plugin-tasks/TasksCapabilities';
import * as TasksEvents from '@dxos/plugin-tasks/TasksEvents';
import { trim } from '@dxos/util';

import { ProjectsNamespace } from './src/namespace.ts';
import * as ProjectCapabilities from './src/types/ProjectCapabilities.ts';
import * as ProjectsEvents from './src/types/ProjectsEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ProjectsNamespace.key,
    name: 'Projects',
    author: 'DXOS',
    description: trim`
      Projects: interactive, long-running processes composed of instructions, skills,
      sentinel commands, routines, artifacts, and AI chat sessions in project context.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-projects',
    icon: { key: 'ph--stack--regular', hue: 'amber' },
    screenshots: [{ dark: 'https://assets.composer.space/demos/2026-10-09-plugin-projects.mp4?v=30bb87a3' }],
    tags: ['alpha', 'assistant'],
    spec: 'PLUGIN.mdl',
    // Assistant is a hard dependency: the article's chat actions and task delegation invoke its
    // operations, so a host that runs Projects must run Assistant beside it.
    dependsOn: ['org.dxos.plugin.assistant', 'org.dxos.plugin.tasks'],
  },
  modules: [
    // Eager, as every migration provider is: a migration missing when a space opens is a data hazard.
    Capability.lazyModule(
      'ProjectsMigrations',
      { provides: [ClientCapabilities.Migration] },
      () => import('./src/capabilities/migrations.ts', { with: { type: 'module-url' } }),
    ),
    // Narrower than the `appGraphBuilder` family default: the nodes it contributes carry
    // `LayoutOperation` actions, which mean nothing without an app shell.
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
    // Browser-only: the entry supplies `CreateProjectPanel`, the React form that picks the project
    // template and collects its name.
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
      },
    ),
    AppCapability.navigationResolver(
      () => import('./src/capabilities/navigation-target-resolver.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    // Bundled so a feature that cites this plugin's spec opens it rendered in the app.
    AppCapability.pluginAsset({
      pluginId: ProjectsNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article, AppRole.CardContent, AppRole.Dialog],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [ProjectCapabilities.Settings],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'SubjectContext',
      { provides: [AssistantCapabilities.SubjectContext], activatesOn: AssistantEvents.Start },
      () => import('./src/capabilities/subject-context.ts', { with: { type: 'module-url' } }),
    ),
    // Injects `Assign to agent`, an `Assign to <agent>` per agent, `Copy prompt` and `Move to…` into plugin-tasks' task rows.
    Capability.lazyModule(
      'TaskAction',
      // Rides the tasks feature it contributes to: the entry is unreachable until a task list renders.
      { provides: [TasksCapabilities.TaskAction], activatesOn: TasksEvents.Start },
      () => import('./src/capabilities/task-action.ts', { with: { type: 'module-url' } }),
    ),
    // Its own module, after the client: which EDGE the browser variant builds on and publishes to comes from the client's config.
    Capability.lazyModule(
      'ComposerPluginTemplate',
      {
        requires: [ClientCapabilities.Client],
        provides: [ProjectCapabilities.Template],
        activatesOn: ClientEvents.Initialized,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/composer-plugin-template.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'Templates',
      {
        provides: [ProjectCapabilities.Template],
        activatesOn: ProjectsEvents.Start,
      },
      () => import('./src/capabilities/templates.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'Tour',
      { provides: [AppCapabilities.Tour], environments: ['browser', 'tauri'] },
      () => import('./src/capabilities/tour.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
