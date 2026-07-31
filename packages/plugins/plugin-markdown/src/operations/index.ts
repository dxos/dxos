//
// Copyright 2025 DXOS.org
//

import { CollaborationOperation } from '@dxos/app-toolkit';
import { OperationHandlerSet } from '@dxos/compute';

import { MarkdownOperation } from '../types';

export const MarkdownOperationHandlerSet = OperationHandlerSet.keyed([
  [CollaborationOperation.AcceptChange, () => import('./accept-change')],
  [MarkdownOperation.Create, () => import('./create')],
  [MarkdownOperation.CreateBranch, () => import('./create-branch')],
  [MarkdownOperation.CreateCheckpoint, () => import('./create-checkpoint')],
  [MarkdownOperation.CreateMarkdown, () => import('./create-markdown')],
  [MarkdownOperation.GetHistory, () => import('./get-history')],
  [MarkdownOperation.GetSelection, () => import('./get-selection')],
  [MarkdownOperation.MergeBranch, () => import('./merge-branch')],
  [MarkdownOperation.Open, () => import('./open')],
  [CollaborationOperation.RejectChange, () => import('./reject-change')],
  [CollaborationOperation.RestoreText, () => import('./restore-text')],
  [MarkdownOperation.ScrollToAnchor, () => import('./scroll-to-anchor')],
  [MarkdownOperation.SuggestEdit, () => import('./suggest-edit')],
  [MarkdownOperation.Update, () => import('./update-markdown')],
]);
