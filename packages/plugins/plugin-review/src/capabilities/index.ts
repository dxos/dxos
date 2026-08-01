//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import type { ReviewPluginOptions } from '#plugin';
import { AgentIdentity, CommentCapabilities, DEFAULT_AGENT_IDENTITY, ReviewCapabilities } from '#types';

export const AgentIdentityModule = Capability.inlineModule(
  'agent-identity',
  {
    provides: [AgentIdentity],
    props: (options: ReviewPluginOptions) => options.agentIdentity ?? DEFAULT_AGENT_IDENTITY,
  },
  (identity) => Effect.succeed([Capability.contribute(AgentIdentity, identity)]),
);
export const AgentRunner = Capability.lazyModule(
  'AgentRunner',
  { provides: [CommentCapabilities.AgentRunner], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./agent-runner'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const HistoryGraph = AppCapability.appGraphBuilder(() => import('./history-graph'), {
  name: 'HistoryGraph',
  activatesOn: ActivationEvents.DeferredStartup,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  // OperationInvoker/AtomRegistry/CommentCapabilities.State are accessed lazily inside the
  // extension-provider callbacks (via the ambient Capability.Service), not yielded at
  // activation time, so they aren't declared here.
  {
    provides: [MarkdownCapabilities.ExtensionProvider, MarkdownCapabilities.ViewModeExtension],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./markdown-extension'),
);
// Markdown owns the editor-binding socket; this plugin owns the version-aware behaviour, and gates
// the history companion for markdown documents.
export const MarkdownBinding = Capability.lazyModule(
  'MarkdownBinding',
  {
    provides: [MarkdownCapabilities.EditorBindingHook, ReviewCapabilities.HistoryProvider],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./markdown-binding'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const HistorySurface = AppCapability.surface(() => import('./history-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.objectProperties'],
  name: 'HistorySurface',
});
export const CommentsSettings = AppCapability.settings(() => import('./settings'), {
  provides: [CommentCapabilities.Settings],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const CommentState = Capability.lazyModule(
  'CommentState',
  { provides: [CommentCapabilities.State], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./state'),
);
export const ReviewState = Capability.lazyModule(
  'ReviewState',
  { provides: [ReviewCapabilities.ReviewRenderPolicy], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./review-state'),
);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
