//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { SpaceCapabilities, SpaceCapability } from '@dxos/plugin-space';

import { MarkdownCapabilities } from '#types';

// Ordering-only: registers the sort comparator once the app graph exists (mirrors the
// AppGraphReady ordering the event-mode module used previously); the body reads nothing.
export const AnchorSort = AppCapability.anchorSort(() => import('./anchor-sort'), {
  requires: [AppCapabilities.AppGraph],
});
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const HistoryProvider = Capability.lazyModule(
  'HistoryProvider',
  { requires: [AppCapabilities.Schema], provides: [SpaceCapabilities.HistoryProvider] },
  () => import('./history-provider'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const MarkdownSettings = AppCapability.settings(() => import('./settings'), {
  provides: [MarkdownCapabilities.Settings],
});
export const MarkdownState = Capability.lazyModule(
  'MarkdownState',
  {
    requires: [AttentionCapabilities.ViewState],
    provides: [MarkdownCapabilities.State, MarkdownCapabilities.EditorState, MarkdownCapabilities.EditorViews],
  },
  () => import('./state'),
);
export const UndoMappings = AppCapability.undoMappings(() => import('./undo-mappings'));
