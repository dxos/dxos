//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import type { CommentsPluginOptions } from '#plugin';
import { AgentIdentity, CommentCapabilities, DEFAULT_AGENT_IDENTITY } from '#types';

export const AgentIdentityModule = Capability.inlineModule(
  'agent-identity',
  {
    provides: [AgentIdentity],
    props: (options: CommentsPluginOptions) => options.agentIdentity ?? DEFAULT_AGENT_IDENTITY,
  },
  (identity) => Effect.succeed([Capability.provide(AgentIdentity, identity)]),
);
export const AgentRunner = Capability.lazyModule(
  'AgentRunner',
  { provides: [CommentCapabilities.AgentRunner] },
  () => import('./agent-runner'),
);
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  // OperationInvoker/AtomRegistry/CommentCapabilities.State are accessed lazily inside the
  // extension-provider callbacks (via the ambient Capability.Service), not yielded at
  // activation time, so they aren't declared here.
  { provides: [MarkdownCapabilities.ExtensionProvider] },
  () => import('./markdown-extension'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const CommentsSettings = AppCapability.settings(() => import('./settings'), {
  provides: [CommentCapabilities.Settings],
});
export const CommentState = Capability.lazyModule(
  'CommentState',
  { provides: [CommentCapabilities.State, CommentCapabilities.ViewState] },
  () => import('./state'),
);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'));
