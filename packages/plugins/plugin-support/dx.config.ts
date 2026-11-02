//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { SupportNamespace } from './src/namespace.ts';
import * as HelpCapabilities from './src/types/HelpCapabilities.ts';
import * as SupportCapabilities from './src/types/SupportCapabilities.ts';
import { type SupportPluginOptions } from './src/types/SupportPluginOptions.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig<SupportPluginOptions> = Plugin.config<SupportPluginOptions>({
  plugin: {
    key: SupportNamespace.key,
    name: 'Support',
    author: 'DXOS',
    description: trim`
      Support provides three user-assistance paths inside Composer. The
      conversational path lets users open a Ticket from the navtree and work with
      the AI assistant to diagnose problems: the assistant searches documentation,
      proposes solutions, and marks the ticket in-progress or resolved. Tickets
      are local-first ECHO objects, so the conversation history is replicated
      across devices and can be reviewed by a human supporter later.

      The one-shot feedback path surfaces a help companion in the deck that lets
      users send anonymous feedback to the observability backend with a single
      form submission. The feedback form captures issue type (bug or feature),
      severity, a short title, a longer description, and an optional plugin area.
      When the user has authenticated a GitHub integration the issue is filed via
      the GitHub API; otherwise a prefilled issues/new URL is opened in a new tab
      so the user can complete submission in their own browser session. Debug logs
      can be attached to any submission via the LogDownloader capability.

      The support skill registers the createTicket, markInProgress,
      resolveTicket, and searchDocs operations as AI tools. When a Ticket is the
      active object the skill is bound to the chat companion so the assistant
      can manage the ticket lifecycle without leaving the conversation. The
      searchDocs operation starts with an in-memory stub and is designed to be
      replaced by a vector index or remote search endpoint without changing the
      schema.

      A future iteration will absorb plugin-help (welcome tour, contextual hints,
      keyboard shortcuts) so all user education lives in a single plugin. The
      initial scope is a Ticket schema, four ticket operations, a FeedbackForm
      component, and two surfaces (Ticket article and the --help companion),
      exercisable end-to-end while documentation search and issue filing
      integrations land in later phases.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-support',
    icon: { key: 'ph--lifebuoy--regular', hue: 'rose' },
    spec: 'PLUGIN.mdl',
    screenshots: [
      {
        dark: 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-08-27-qa-flows/plugin-support-QA-1.webm',
      },
    ],
    tags: ['system'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
      {
        requires: [SupportCapabilities.Settings],
      },
    ),
    SpaceCapability.createObject(() => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'HelpState',
      {
        requires: [Capabilities.AtomRegistry],
        provides: [AppCapabilities.Settings, HelpCapabilities.SeenTours, HelpCapabilities.State],
      },
      () => import('./src/capabilities/help-state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: SupportNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.reactRoot(() => import('./src/capabilities/react-root.tsx', { with: { type: 'module-url' } })),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        'org.dxos.plugin.space.role.homeContent',
        'org.dxos.plugin.support.role.hints',
        'org.dxos.plugin.support.role.keyshortcuts',
        'org.dxos.role.article',
        'org.dxos.role.deckCompanion.discord',
        'org.dxos.role.deckCompanion.help',
        'org.dxos.role.dialog',
        'org.dxos.role.section',
        'org.dxos.role.statusIndicator',
      ],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [SupportCapabilities.Settings],
    }),
    Capability.lazyModule(
      'Tour',
      {
        provides: [AppCapabilities.Tour],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/tour.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'TourAutoStart',
      {
        requires: [
          AppCapabilities.AppGraph,
          AttentionCapabilities.Attention,
          Capabilities.AtomRegistry,
          Capabilities.OperationInvoker,
          ClientCapabilities.Client,
          HelpCapabilities.SeenTours,
          HelpCapabilities.State,
        ],
        provides: [],
      },
      () => import('./src/capabilities/tour-auto-start.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export type { SupportPluginOptions } from './src/types/SupportPluginOptions.ts';

export const { meta, make } = config;

export default config;
