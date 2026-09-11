//
// Copyright 2025 DXOS.org
//

import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MarkdownOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  CollaborationOperation.AcceptChange.pipe(Operation.lazyHandler(() => import('./accept-change.ts'))),
  CollaborationOperation.RejectChange.pipe(Operation.lazyHandler(() => import('./reject-change.ts'))),
  CollaborationOperation.RestoreText.pipe(Operation.lazyHandler(() => import('./restore-text.ts'))),
  MarkdownOperation.Create.pipe(Operation.lazyHandler(() => import('./create.ts'))),
  MarkdownOperation.CreateMarkdown.pipe(Operation.lazyHandler(() => import('./create-markdown.ts'))),
  MarkdownOperation.CreateBranch.pipe(Operation.lazyHandler(() => import('./create-branch.ts'))),
  MarkdownOperation.CreateCheckpoint.pipe(Operation.lazyHandler(() => import('./create-checkpoint.ts'))),
  MarkdownOperation.GetHistory.pipe(Operation.lazyHandler(() => import('./get-history.ts'))),
  MarkdownOperation.GetSelection.pipe(Operation.lazyHandler(() => import('./get-selection.ts'))),
  MarkdownOperation.MergeBranch.pipe(Operation.lazyHandler(() => import('./merge-branch.ts'))),
  MarkdownOperation.Open.pipe(Operation.lazyHandler(() => import('./open.ts'))),
  MarkdownOperation.ScrollToAnchor.pipe(Operation.lazyHandler(() => import('./scroll-to-anchor.ts'))),
  MarkdownOperation.SuggestEdit.pipe(Operation.lazyHandler(() => import('./suggest-edit.ts'))),
  MarkdownOperation.Update.pipe(Operation.lazyHandler(() => import('./update-markdown.ts'))),
]);
