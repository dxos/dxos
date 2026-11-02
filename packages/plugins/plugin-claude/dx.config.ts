//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import { trim } from '@dxos/util';

import { ClaudeNamespace } from './src/namespace.ts';
import * as ClaudeCapabilities from './src/types/ClaudeCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: ClaudeNamespace.key,
    name: 'Claude',
    author: 'DXOS',
    description: trim`
      Run Anthropic Claude agents from your space. In the desktop app, assign a project's tasks to
      Claude Code on this computer and follow its session in the chat. Managed agents run on Anthropic:
      an agent's configuration — model, system prompt, toolsets, skills and MCP servers — is an object
      you edit locally and deploy to Anthropic, which hosts and runs it on your behalf.

      Sessions started against an agent are recorded alongside it, so the assistant can deploy an
      agent, start a session, send it work and read back the transcript without leaving the space.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-claude',
    icon: { key: 'px--anthropic--regular', hue: 'yellow' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.assistant', 'org.dxos.plugin.code'],
  },
  modules: [
    /** Runs coding agents through the desktop app's `dx-agent` sidecar. */
    Capability.lazyModule(
      'AgentLauncher',
      { provides: [ClaudeCapabilities.AgentHelper], activatesOn: ActivationEvents.Startup, environments: ['tauri'] },
      () => import('./src/capabilities/agent-launcher.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'ClaudeCodeAgent',
      {
        environments: ['browser', 'node', 'tauri'],
        provides: [AssistantCapabilities.Agent, AssistantCapabilities.AgentProcess],
        // Off the boot path: loading it pulls in the MCP SDK, and agents are only read once the assistant runs a turn.
        activatesOn: AppActivationEvents.AssistantStart,
      },
      () => import('./src/capabilities/claude-code-agent.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'ClaudeCodeEdgeAgent',
      {
        environments: ['browser', 'node', 'tauri'],
        provides: [AssistantCapabilities.Agent],
        activatesOn: AppActivationEvents.AssistantStart,
      },
      () => import('./src/capabilities/claude-code-edge-agent.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'ClaudeCodeConnector',
      { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
      () => import('./src/capabilities/connector.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: ClaudeNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.plugin.projects.role.settings'],
    }),
    AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } })),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [ClaudeCapabilities.Settings],
    }),
    AppCapability.layerSpec(() => import('./src/capabilities/shell-service.ts', { with: { type: 'module-url' } }), {
      name: 'ShellService',
      environments: ['node'],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'State',
      { provides: [ClaudeCapabilities.State], activatesOn: ActivationEvents.Startup },
      () => import('./src/capabilities/state.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
