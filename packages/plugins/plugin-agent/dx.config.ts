//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadEvents from '@dxos/plugin-thread/ThreadEvents';
import { trim } from '@dxos/util';

import { AgentNamespace } from './src/namespace.ts';
import * as AgentCapabilities from './src/types/AgentCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: AgentNamespace.key,
    name: 'Agent',
    author: 'DXOS',
    description: trim`
      Autonomous agents that converse with people in channels and Composer chats. Give an agent
      channels — a Discord bot, a freeq room, a local feed — and each conversation in them becomes a
      chat the agent replies in.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-agent',
    icon: { key: 'ph--chats-circle--regular', hue: 'violet' },
    tags: ['labs', 'assistant'],
    dependsOn: ['org.dxos.plugin.assistant', 'org.dxos.plugin.thread'],
  },
  modules: [
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.layerSpec(() => import('./src/capabilities/brain.ts', { with: { type: 'module-url' } }), {
      name: 'Brain',
      environments: ['browser', 'node', 'tauri'],
    }),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [AgentCapabilities.Settings],
    }),
    // Follows the members panel's admissions, which only the app makes; a headless host adds no members.
    Capability.lazyModule(
      'AgentAdmission',
      {
        requires: [Capabilities.OperationInvoker, ClientCapabilities.Client],
        provides: [],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/agent-admission.ts', { with: { type: 'module-url' } }),
    ),
    // Makes the members who may write to the spaces of the agents this identity administers those agents' admins on EDGE,
    // which only the app shows; a headless host administers no agent. plugin-client provides the EDGE HTTP client only
    // once the client initializes, so requiring it keeps the sync from activating before then and finding no EDGE to ask.
    Capability.lazyModule(
      'AgentAdminSync',
      {
        requires: [ClientCapabilities.Client, ClientCapabilities.EdgeHttpClient],
        provides: [],
        environments: ['browser', 'tauri'],
      },
      () => import('./src/capabilities/agent-admin-sync.ts', { with: { type: 'module-url' } }),
    ),
    // EDGE's mailboxes over the client's EDGE HTTP client (`EdgeHttpClientService`), which plugin-client provides.
    AppCapability.layerSpec(() => import('./src/capabilities/agent-mailbox.ts', { with: { type: 'module-url' } }), {
      name: 'AgentMailbox',
      environments: ['browser', 'node', 'tauri'],
    }),
    // Not on EDGE: connecting claims the address through the app's client, and EDGE never connects a channel.
    Capability.lazyModule(
      'EmailChannelBackend',
      {
        provides: [ThreadCapabilities.ChannelBackend],
        activatesOn: ThreadEvents.Start,
        environments: ['browser', 'node', 'tauri'],
      },
      () => import('./src/capabilities/email-channel-backend.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
      {
        provides: [AppCapabilities.HookDefinition],
      },
    ),
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.surface(() => import('./src/capabilities/react-surface.tsx', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
