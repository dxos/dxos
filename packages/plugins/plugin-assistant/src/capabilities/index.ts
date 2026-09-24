//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export { AgentHydrator } from './agent-hydrator.ts';
export { AgentRuntime } from './agent-service.ts';
export { AiContext } from './ai-context.ts';
export { AssistantAiService as AiService } from './ai-service.ts';
export { Connector } from './connector.ts';
export { AssistantAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { AutomationTemplates } from './automation-templates.ts';
export const Schema = AppCapability.lazySchema(() => import('./schema-defs.ts'));
export { SubjectContext } from './subject-context.ts';
export { SkillDefinition } from './skill-definition.ts';
export { CompanionChatProvisioner } from './companion-chat-provisioner.ts';
export { CreateObject } from './create-object.ts';
export { EdgeModelResolver } from './edge-model-resolver.ts';
export { LocalModelResolver } from './local-model-resolver.ts';
export { MarkdownExtension } from './markdown-extension.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { Settings } from './settings.ts';
export { AssistantState } from './state.ts';
export { Toolkit } from './toolkit.ts';
export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
