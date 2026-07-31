//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { CommentOperation } from '../types';

export const CommentOperationHandlerSet = OperationHandlerSet.keyed([
  [CommentOperation.AddMessage, () => import('./add-message')],
  [CommentOperation.Create, () => import('./create')],
  [CommentOperation.CreateProposals, () => import('./create-proposals')],
  [CommentOperation.Delete, () => import('./delete')],
  [CommentOperation.DeleteMessage, () => import('./delete-message')],
  [CommentOperation.RespondToThread, () => import('./respond-to-thread')],
  [CommentOperation.Restore, () => import('./restore')],
  [CommentOperation.RestoreMessage, () => import('./restore-message')],
  [CommentOperation.Select, () => import('./select')],
  [CommentOperation.SetAgentConfig, () => import('./set-agent-config')],
  [CommentOperation.ToggleResolved, () => import('./toggle-resolved')],
]);
