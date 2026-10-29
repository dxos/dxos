//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClaudeCapabilities from '@dxos/plugin-claude/ClaudeCapabilities';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';
import { trim } from '@dxos/util';

import { DevShellNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: DevShellNamespace.key,
    name: 'Dev Shell',
    author: 'DXOS',
    description: trim`
      PROOF OF CONCEPT — DEV ONLY. Works only in a Composer served by a vite dev server,
      whose working directory is the tree the tools operate on. In any deployed build there
      is no dev server, so both tools fail with a configuration error.

      A minimal coding harness for the assistant: a bash tool and a multi-string-replace
      edit tool that run on the developer's own machine.

      Both tools are carried by a single dev-server route — one POST that runs a shell
      script under the server's own root and returns stdout, stderr and the exit code. The
      root scopes where a script starts; it does not sandbox the shell, so treat the
      harness as a terminal left open on your own checkout.

      This is the in-app alternative to delegating a turn to an external agent harness —
      the assistant keeps its own loop, its own context and its own transcript, and gains
      the two tools that loop was missing.
    `,
    icon: { key: 'ph--terminal-window--regular', hue: 'amber' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-dev-shell',
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
  modules: [
    /** Runs coding agents through the dev server; the desktop app runs them through plugin-claude's sidecar instead. */
    Capability.lazyModule(
      'AgentHost',
      { provides: [ClaudeCapabilities.AgentHelper], activatesOn: ActivationEvents.Startup, environments: ['browser'] },
      () => import('./src/capabilities/agent-host.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.pluginAsset({
      pluginId: DevShellNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    Capability.lazyModule(
      'ProjectTemplates',
      { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
      () => import('./src/capabilities/project-templates.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
