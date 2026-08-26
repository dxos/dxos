//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CommentOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  CommentOperation.AddMessage.pipe(Operation.lazyHandler(() => import('./add-message'))),
  CommentOperation.Create.pipe(Operation.lazyHandler(() => import('./create'))),
  CommentOperation.CreateProposals.pipe(Operation.lazyHandler(() => import('./create-proposals'))),
  CommentOperation.Delete.pipe(Operation.lazyHandler(() => import('./delete'))),
  CommentOperation.DeleteMessage.pipe(Operation.lazyHandler(() => import('./delete-message'))),
  CommentOperation.RespondToThread.pipe(Operation.lazyHandler(() => import('./respond-to-thread'))),
  CommentOperation.Restore.pipe(Operation.lazyHandler(() => import('./restore'))),
  CommentOperation.RestoreMessage.pipe(Operation.lazyHandler(() => import('./restore-message'))),
  CommentOperation.Select.pipe(Operation.lazyHandler(() => import('./select'))),
  CommentOperation.SetAgentConfig.pipe(Operation.lazyHandler(() => import('./set-agent-config'))),
  CommentOperation.SetResolved.pipe(Operation.lazyHandler(() => import('./set-resolved'))),
]);
