//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantEvents from '@dxos/plugin-assistant/AssistantEvents';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as GitHubCapabilities from '@dxos/plugin-github/GitHubCapabilities';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';
import * as ProjectSurface from '@dxos/plugin-projects/ProjectSurface';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { CodeNamespace } from './src/namespace.ts';
import * as CodeCapabilities from './src/types/CodeCapabilities.ts';
import * as CodeEvents from './src/types/CodeEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: CodeNamespace.key,
    name: 'Code',
    author: 'DXOS',
    description: trim`
      Code is the plugin-authoring workbench for DXOS Composer. It pairs a
      structured DEUS spec document (a .mdl file describing types, components,
      operations, and acceptance tests) with a CodeProject that holds the
      TypeScript source tree produced from that spec. Both objects live in ECHO,
      so edits are CRDT-merged and fully reactive — the same space can be shared
      with collaborators or an AI agent without any special sync infrastructure.

      The Coder skill drives the authoring loop: the assistant refines the
      spec with the user, then calls the introspect-mcp server to look up live
      DXOS and Composer APIs before writing source files. A full file-CRUD
      operation set (scaffold, list, read, write, delete, reset, helloWorld) is
      exposed as skill tools, letting the agent build up a project
      incrementally and correct mistakes without leaving the chat. An Anthropic
      API key can be stored securely as an AccessToken in the user's HALO space
      via the plugin's settings panel.

      The CodeArticle surface renders a two-pane layout: a hierarchical FileTree
      on the left derived from the project's SourceFile paths, and a
      react-ui-editor CodeMirror instance on the right that selects the
      appropriate language mode (TypeScript, Markdown, or plain text) based on
      the selected file's extension. The SpecArticle surfaces the .mdl document
      with dedicated syntax highlighting, linting, and completion extensions so
      the spec itself is pleasant to read and edit by hand.

      An in-browser build pipeline transpiles the project's TypeScript sources
      using a virtual TypeScript environment for single-file projects, and
      esbuild-wasm for multi-file bundles. The buildProject operation returns
      typed diagnostics; runBuild evaluates the emitted JavaScript in a
      console-capturing wrapper and returns stdout and stderr, giving the agent
      a fast verify-and-fix loop without requiring any external build service.
      Remote dispatch to an EDGE build agent is wired as a stub and will be
      activated in a subsequent phase.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-code',
    icon: { key: 'ph--code--regular', hue: 'indigo' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    // Projects owns specs and the plain editor of their text; this plugin's spec page builds on that.
    dependsOn: ['org.dxos.plugin.projects'],
  },
  modules: [
    // Eager, as every migration provider is: a migration missing when a space opens is a data hazard.
    Capability.lazyModule(
      'FeatureMigrations',
      { provides: [ClientCapabilities.Migration] },
      () => import('./src/capabilities/migrations.ts', { with: { type: 'module-url' } }),
    ),
    // Registered at startup so a GitHub file sync on EDGE, where no UI event fires, finds the mapping.
    Capability.lazyModule(
      'SpecFileMapping',
      { provides: [GitHubCapabilities.FileMapping], activatesOn: ActivationEvents.Startup },
      () => import('./src/capabilities/spec-file-mapping.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    // Narrower than the `appGraphBuilder` family default: the feature nodes open levels through the app shell.
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/feature-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
        name: 'FeatureAppGraphBuilder',
      },
    ),
    Capability.lazyModule(
      'BuildRunState',
      { provides: [CodeCapabilities.BuildRun], activatesOn: CodeEvents.Start },
      () => import('./src/capabilities/build-run-state.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    AppCapability.mcpServer(() => import('./src/capabilities/mcp-server.ts', { with: { type: 'module-url' } })),
    AppCapability.navigationResolver(
      () => import('./src/capabilities/navigation-target-resolver.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: CodeNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/feature-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        AppSurface.Article,
        AppSurface.CardContent,
        AppSurface.Dialog,
        AppSurface.Section,
        ProjectSurface.LevelOverview,
        ProjectSurface.SpecView,
      ],
      name: 'FeatureSurface',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppSurface.Article, AppSurface.Section],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [CodeCapabilities.Settings],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    // Eager, as the migrations are: a spec synced to its file before the codec arrives would take the file's `feat`
    // blocks in as text.
    Capability.lazyModule(
      'SpecCodec',
      { provides: [ProjectCapabilities.SpecCodec] },
      () => import('./src/capabilities/spec-codec.ts', { with: { type: 'module-url' } }),
    ),
    // Off the boot path: an editor that opened before they arrive is rebuilt with the cards.
    Capability.lazyModule(
      'SpecExtensions',
      {
        provides: [ProjectCapabilities.SpecExtensions, ProjectCapabilities.SpecPackage, ProjectCapabilities.SpecView],
        activatesOn: ActivationEvents.Idle,
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/spec-extensions.ts', { with: { type: 'module-url' } }),
    ),
    // Local files are reachable only from the desktop app or a dev server; settings supply the configured checkouts.
    Capability.lazyModule(
      'SpecSync',
      {
        requires: [ClientCapabilities.Client, CodeCapabilities.Settings, Capabilities.AtomRegistry],
        provides: [CodeCapabilities.SpecSync],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/spec-sync.ts', { with: { type: 'module-url' } }),
    ),
    // Comments on a feature's fields and the features on a map, which plugin-review reads.
    Capability.lazyModule(
      'FeatureComments',
      {
        provides: [
          AppCapabilities.AnchorResolver,
          AppCapabilities.AnchorSort,
          AppCapabilities.CommentConfig,
          AppCapabilities.CommentScope,
        ],
        activatesOn: ProjectsEvents.Start,
      },
      () => import('./src/capabilities/feature-comments.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'FeatureSubjectContext',
      { provides: [AssistantCapabilities.SubjectContext], activatesOn: AssistantEvents.Start },
      () => import('./src/capabilities/feature-subject-context.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'FeatureTemplates',
      { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
      () => import('./src/capabilities/templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
