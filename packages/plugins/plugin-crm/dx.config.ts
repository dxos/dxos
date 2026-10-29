//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import { trim } from '@dxos/util';

import { CrmNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: CrmNamespace.key,
    name: 'CRM',
    author: 'DXOS',
    description: trim`
      CRM maintains Person and Organization records with linked markdown Profile
      documents in your local-first ECHO space. Deterministic operations do the
      structural work: Process mailbox extracts contacts from a mailbox's new
      messages against a durable feed cursor (with the same extraction gate and
      identity-based dedup as mail sync), and Research person / Research
      organization scaffold a Profile document skeleton linked to its subject via
      a ProfileOf ECHO relation. A skill composes those operations with the
      web-search, database, and markdown skills so the AI assistant can enrich
      profiles with researched content.

      The plugin is a thin composition layer: contact-extraction semantics come
      from @dxos/extractor-lib, cursoring from @dxos/link, and heavy lifting such
      as web search, document creation, and ECHO database CRUD is delegated to
      existing skills from @dxos/assistant-toolkit. plugin-crm additionally
      contributes a best-effort image-attachment operation that uploads avatars
      and company logos to the DXOS image service, project/automation templates
      that run CRM processing when new mail arrives, and a pluggable
      ResearchSource contract for future extensions (such as a planned LinkedIn
      integration via the browser extension).
    `,
    icon: { key: 'ph--address-book--regular', hue: 'rose' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-crm',
    spec: 'PLUGIN.mdl',
    dependsOn: ['org.dxos.plugin.inbox'],
    tags: ['alpha'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'AutomationTemplates',
      { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
      () => import('./src/capabilities/automation-templates.ts', { with: { type: 'module-url' } }),
    ),
    // Injects the `Process CRM` action into plugin-inbox's mailbox toolbar menu.
    Capability.lazyModule(
      'MailboxAction',
      // Rides the inbox feature it contributes to, exactly as the plugin-brain sibling does - the
      // action is unreachable until a mailbox renders.
      {
        requires: [ClientCapabilities.Client],
        provides: [InboxCapabilities.MailboxAction],
        activatesOn: InboxEvents.Start,
      },
      () => import('./src/capabilities/mailbox-action.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'MailboxProcessor',
      { provides: [InboxCapabilities.MailboxProcessor], activatesOn: InboxEvents.Start },
      () => import('./src/capabilities/mailbox-processor.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: CrmNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    Capability.lazyModule(
      'ProjectTemplates',
      { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
      () => import('./src/capabilities/project-templates.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    Capability.lazyModule(
      'SenderAction',
      // Rides the inbox feature it contributes to, like its MailboxAction sibling - the entry is
      // unreachable until a conversation renders.
      {
        requires: [ClientCapabilities.Client],
        provides: [InboxCapabilities.SenderAction],
        activatesOn: InboxEvents.Start,
      },
      () => import('./src/capabilities/sender-action.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
