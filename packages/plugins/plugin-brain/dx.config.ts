//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';
import { trim } from '@dxos/util';

import { BrainNamespace } from './src/namespace.ts';
import * as BrainCapabilities from './src/types/BrainCapabilities.ts';
import * as BrainSurface from './src/types/BrainSurface.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: BrainNamespace.key,
    name: 'Brain',
    author: 'DXOS',
    description: trim`
      A per-space semantic index of facts extracted from your content.
      Provides fact storage, assistant tools for querying and summarizing facts, and a fact viewer.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-brain',
    icon: { key: 'ph--brain--regular', hue: 'purple' },
    spec: 'PLUGIN.mdl',
    tags: ['labs', 'assistant'],
  },
  modules: [
    // Provides `FactStore` over the space's memory to operations that still declare it; loaded lazily, since it
    // value-imports the `@dxos/pipeline-rdf` barrel.
    AppCapability.layerSpec(() => import('./src/capabilities/fact-store.ts', { with: { type: 'module-url' } }), {
      name: 'FactStore',
    }),
    // Injects the `Analyze` action into plugin-inbox's mailbox toolbar menu (fact analysis is owned by
    // brain); reads the settings atom live at invoke time. Shares the atom with the Settings module.
    Capability.lazyModule(
      'MailboxProcessor',
      {
        requires: [Capabilities.AtomRegistry],
        provides: [InboxCapabilities.MailboxProcessor],
        activatesOn: InboxEvents.Start,
      },
      () => import('./src/capabilities/mailbox-processor.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    // Contributes the "Mailbox Facts" project template: a scheduled AnalyzeMailbox routine plus
    // brain-skill chats, scoped to one project.
    AppCapability.pluginAsset({
      pluginId: BrainNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    Capability.lazyModule(
      'ProjectTemplates',
      { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
      () => import('./src/capabilities/project-templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [BrainSurface.Facts],
    }),
    Capability.lazyModule(
      'ReplyGenerator',
      { provides: [InboxCapabilities.ReplyGenerator], activatesOn: InboxEvents.Start },
      () => import('./src/capabilities/reply-generator.ts', { with: { type: 'module-url' } }),
    ),
    // Owns the fact-analysis settings (model/provider/strict) and registers them in the settings UI.
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [BrainCapabilities.Settings],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
