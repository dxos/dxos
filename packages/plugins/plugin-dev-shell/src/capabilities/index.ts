//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClaudeCapabilities from '@dxos/plugin-claude/ClaudeCapabilities';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';

import { meta } from '#meta';

export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: () => import('../../PLUGIN.mdl?raw'),
  mimeType: 'application/x-mdl',
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const ProjectTemplates = Capability.lazyModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
  () => import('./project-templates.ts'),
);

/** Runs coding agents through the dev server; the desktop app runs them through plugin-claude's sidecar instead. */
export const AgentHost = Capability.lazyModule(
  'AgentHost',
  { provides: [ClaudeCapabilities.AgentHelper], activatesOn: ActivationEvents.Startup, environments: ['browser'] },
  () => import('./agent-host.ts'),
);
