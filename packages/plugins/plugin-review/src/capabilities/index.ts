//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';

import { meta } from '#meta';
import type { ReviewPluginOptions } from '#plugin';
import { translations } from '#translations';
import { AgentIdentity, CommentCapabilities, ReviewCapabilities, ReviewEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AgentIdentityModule = Capability.inlineModule(
  'agent-identity',
  {
    provides: [AgentIdentity.AgentIdentity],
    props: (options: ReviewPluginOptions) => options.agentIdentity ?? AgentIdentity.DEFAULT_AGENT_IDENTITY,
  },
  (identity) => Effect.succeed([Capability.contribute(AgentIdentity.AgentIdentity, identity)]),
);
export const AgentRunner = Capability.lazyModule(
  'AgentRunner',
  { provides: [CommentCapabilities.AgentRunner], activatesOn: ReviewEvents.Start },
  () => import('./agent-runner'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  environments: ['node'],
});
export const HistoryGraph = AppCapability.appGraphBuilder(() => import('./history-graph'), {
  name: 'HistoryGraph',
  environments: ['node'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'), {
  environments: ['node'],
});
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  // OperationInvoker/AtomRegistry are ambient. `CommentCapabilities.State` is declared because the
  // provider callbacks read it and it is contributed by this plugin's own idle-gated module, which
  // markdown start can otherwise precede.
  {
    requires: [CommentCapabilities.State],
    provides: [MarkdownCapabilities.ExtensionProvider, MarkdownCapabilities.ViewModeExtension],
    activatesOn: MarkdownEvents.Start,
  },
  () => import('./markdown-extension'),
);
// Markdown owns the editor-binding socket; this plugin owns the version-aware behaviour, and gates
// the history companion for markdown documents. Browser-only: the binding it contributes is
// `useMarkdownEditorBinding`, a React hook that mounts the version toolbar and suggestion overlays.
export const MarkdownBinding = Capability.lazyModule(
  'MarkdownBinding',
  {
    provides: [MarkdownCapabilities.EditorBindingHook, ReviewCapabilities.HistoryProvider],
    activatesOn: MarkdownEvents.Start,
    environments: [],
  },
  () => import('./markdown-binding'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const HistorySurface = AppCapability.surface(() => import('./history-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
  name: 'HistorySurface',
});
export const CommentsSettings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
  provides: [CommentCapabilities.Settings],
});
export const CommentState = Capability.lazyModule(
  'CommentState',
  // Headless: comments sync in a markdown document with no review surface ever rendered, so gating
  // this on the review UI's start is wrong. Ungated (hence idle) it is also pullable by the
  // consumers that need it earlier, which a start-gated provider is not.
  { provides: [CommentCapabilities.State] },
  () => import('./state'),
);
export const ReviewState = Capability.lazyModule(
  'ReviewState',
  {
    provides: [ReviewCapabilities.ReviewRenderPolicy],
    activatesOn: ReviewEvents.Start,
    environments: ['node'],
  },
  () => import('./review-state'),
);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'), {
  activatesOn: ReviewEvents.Start,
  environments: ['node'],
});
export const Translations = AppCapability.translations([...translations, ...threadTranslations]);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
