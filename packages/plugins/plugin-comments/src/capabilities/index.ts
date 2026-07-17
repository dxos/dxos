//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationHandlerSet, Skill } from '@dxos/compute';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationInvoker } from '@dxos/operation';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { CommentCapabilities } from '#types';

export const AgentRunner = Capability.lazyModule(
  'AgentRunner',
  { provides: [CommentCapabilities.AgentRunner] },
  () => import('./agent-runner'),
);
export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const SkillDefinition = Capability.lazyModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  () => import('./skill-definition'),
);
export const Markdown = Capability.lazyModule(
  'MarkdownExtension',
  {
    requires: [Capabilities.OperationInvoker, Capabilities.AtomRegistry, CommentCapabilities.State],
    provides: [MarkdownCapabilities.ExtensionProvider],
  },
  () => import('./markdown-extension'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const ReactSurface = Capability.lazyModule(
  'ReactSurface',
  { provides: [Capabilities.ReactSurface] },
  () => import('./react-surface'),
);
export const CommentsSettings = Capability.lazyModule(
  'CommentsSettings',
  { provides: [CommentCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
export const CommentState = Capability.lazyModule(
  'CommentState',
  { provides: [CommentCapabilities.State, CommentCapabilities.ViewState] },
  () => import('./state'),
);
export const UndoMappings = Capability.lazyModule(
  'UndoMappings',
  { provides: [Capabilities.UndoMapping] },
  () => import('./undo-mappings'),
);
