//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import { trim } from '@dxos/util';

import { InboxNamespace } from './src/namespace.ts';
import * as InboxCapabilities from './src/types/InboxCapabilities.ts';
import * as InboxEvents from './src/types/InboxEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: InboxNamespace.key,
    name: 'Inbox',
    author: 'DXOS',
    description: trim`
      A unified inbox for managing email, calendar events, and contacts directly inside your workspace. Mailboxes and calendars are backed by append-only ECHO feeds, so messages and events stream in from sync without ever overwriting history.

      Connect a Google Integration to pull Gmail messages, Calendar events, and Contact groups into the space; subsequent syncs use delta tokens to fetch only what changed. Compose, reply, and forward inline — drafts live in ECHO and outbound mail is dispatched via the linked Integration.

      Saved filters and labels narrow the message list to the conversations that matter, and an optional conversation view groups responses together. Each selected message surfaces related contacts, events, and conversation history alongside the reading pane so context is always one click away.

      An Inbox skill gives AI agents tools to read, draft, classify, and sync mail, plus message extractors that parse confirmation emails (flights, hotels, reservations) into structured Trip and Event objects in the space.
    `,
    icon: { key: 'ph--mailbox--regular', hue: 'rose' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-inbox',
    tags: ['alpha', 'connector'],
  },
  modules: [
    Capability.lazyModule(
      'MailboxActions',
      // Rides the inbox feature it contributes to: the button is unreachable until a mailbox renders.
      { provides: [InboxCapabilities.MailboxAction], activatesOn: InboxEvents.Start },
      () => import('./src/capabilities/mailbox-actions.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'AutomationTemplates',
      { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
      () => import('./src/capabilities/automation-templates.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'contact-extractor',
      { provides: [InboxCapabilities.ObjectExtractor] },
      () => import('./src/capabilities/contact-extractor.ts', { with: { type: 'module-url' } }),
    ),
    SpaceCapability.createObject(
      () => import('./src/capabilities/create-object.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'IdentitySpecs',
      { provides: [SpaceCapabilities.IdentitySpec] },
      () => import('./src/capabilities/identity-specs.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      provides: [InboxCapabilities.Settings],
      activatesOn: ActivationEvents.Idle,
    }),
    // Read only by AnalyzeMailbox, which fires the start event before it reads them.
    Capability.lazyModule(
      'MailboxProcessors',
      { provides: [InboxCapabilities.MailboxProcessor], activatesOn: InboxEvents.Start },
      () => import('./src/capabilities/mailbox-processors.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.navigationResolver(
      () => import('./src/capabilities/navigation-target-resolver.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'tauri'],
        requires: [ClientCapabilities.Client],
      },
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [
        AppRole.Article,
        AppRole.CardContent,
        AppRole.ObjectProperties,
        AppRole.Popover,
        AppRole.Related,
        AppRole.Section,
      ],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        environments: ['browser', 'node', 'tauri'],
      },
    ),
    Capability.lazyModule(
      'summarize-extractor',
      { provides: [InboxCapabilities.ObjectExtractor] },
      () => import('./src/capabilities/summarize-extractor.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
