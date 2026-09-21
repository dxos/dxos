//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';

import { meta } from '#meta';
import type { ReviewPluginOptions } from '#plugin';
import { translations } from '#translations';
import { AgentIdentity } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AgentIdentityModule = Capability.makeModule(
  'agent-identity',
  {
    provides: [AgentIdentity.AgentIdentity],
    props: (options: ReviewPluginOptions) => options.agentIdentity ?? AgentIdentity.DEFAULT_AGENT_IDENTITY,
  },
  (identity) => Effect.succeed([Capability.contribute(AgentIdentity.AgentIdentity, identity)]),
);
export { AgentRunner } from './agent-runner.ts';
export { ReviewAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { HistoryGraph } from './history-graph.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { Markdown } from './markdown-extension.ts';
// Markdown owns the editor-binding socket; this plugin owns the version-aware behaviour, and gates
// the history companion for markdown documents. Browser-only: the binding it contributes is
// `useMarkdownEditorBinding`, a React hook that mounts the version toolbar and suggestion overlays.
export { MarkdownBinding } from './markdown-binding.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { HistorySurface } from './history-surface.tsx';
export { CommentsSettings } from './settings.ts';
export { CommentState } from './state.ts';
export { ReviewState } from './review-state.ts';
export { UndoMappings } from './undo-mappings.ts';
export { TourFragment } from './tour-fragment.ts';
export const Translations = AppCapability.translations([...translations, ...threadTranslations]);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
