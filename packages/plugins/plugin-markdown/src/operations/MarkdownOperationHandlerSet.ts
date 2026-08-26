//
// Copyright 2025 DXOS.org
//

import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { MarkdownOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  CollaborationOperation.AcceptChange.pipe(Operation.lazyHandler(() => import('./accept-change'))),
  CollaborationOperation.RejectChange.pipe(Operation.lazyHandler(() => import('./reject-change'))),
  CollaborationOperation.RestoreText.pipe(Operation.lazyHandler(() => import('./restore-text'))),
  MarkdownOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  MarkdownOperation.CreateMarkdown.pipe(Operation.lazyHandler(() => import('./create-markdown'))),
  MarkdownOperation.CreateBranch.pipe(Operation.lazyHandler(() => import('./create-branch'))),
  MarkdownOperation.CreateCheckpoint.pipe(Operation.lazyHandler(() => import('./create-checkpoint'))),
  MarkdownOperation.GetHistory.pipe(Operation.lazyHandler(() => import('./get-history'))),
  MarkdownOperation.GetSelection.pipe(Operation.lazyHandler(() => import('./get-selection'))),
  MarkdownOperation.MergeBranch.pipe(Operation.lazyHandler(() => import('./merge-branch'))),
  MarkdownOperation.Open.pipe(Operation.lazyHandler(() => import('./open'))),
  MarkdownOperation.ScrollToAnchor.pipe(Operation.lazyHandler(() => import('./scroll-to-anchor'))),
  MarkdownOperation.SuggestEdit.pipe(Operation.lazyHandler(() => import('./suggest-edit'))),
  MarkdownOperation.Update.pipe(Operation.lazyHandler(() => import('./update-markdown'))),
]);
