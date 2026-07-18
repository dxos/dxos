//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public
// aliases instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Graph, GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Operation, OperationHandlerSet, Skill } from '@dxos/compute';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { MarkdownCapabilities } from '#types';

export const AnchorSort = Capability.lazyModule(
  'AnchorSort',
  // Ordering-only: registers the sort comparator once the app graph exists (mirrors the
  // AppGraphReady ordering the event-mode module used previously); the body reads nothing.
  { requires: [AppCapabilities.AppGraph], provides: [AppCapabilities.AnchorSort] },
  () => import('./anchor-sort'),
);
export const CommentConfig = Capability.lazyModule(
  'CommentConfig',
  { provides: [AppCapabilities.CommentConfig] },
  () => import('./comment-config'),
);
export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);
export const SkillDefinition = Capability.lazyModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  () => import('./skill-definition'),
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
export const MarkdownSettings = Capability.lazyModule(
  'MarkdownSettings',
  { provides: [MarkdownCapabilities.Settings, AppCapabilities.Settings] },
  () => import('./settings'),
);
export const MarkdownState = Capability.lazyModule(
  'MarkdownState',
  {
    requires: [AttentionCapabilities.ViewState],
    provides: [MarkdownCapabilities.State, MarkdownCapabilities.EditorState, MarkdownCapabilities.EditorViews],
  },
  () => import('./state'),
);
