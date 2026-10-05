//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const ClaudeCodeAgent = Capability.lazyModule(
  'ClaudeCodeAgent',
  {
    provides: [AssistantCapabilities.Agent, AssistantCapabilities.AgentProcess],
    activatesOn: ActivationEvents.Startup,
  },
  () => import('./claude-code-agent.ts'),
);

export const Subprocess = AppCapability.layerSpec(() => import('./subprocess.ts'), {
  name: 'Subprocess',
  environments: ['node'],
});

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});

export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const Translations = AppCapability.translations(translations);
