//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { CommentOperation } from '#types';

export const handlers = OperationHandlerSet.lazy([
  CommentOperation.AddMessage.pipe(Operation.lazyHandler(() => import('./add-message.ts'))),
  CommentOperation.Create.pipe(Operation.lazyHandler(() => import('./create.ts'))),
  CommentOperation.CreateProposals.pipe(Operation.lazyHandler(() => import('./create-proposals.ts'))),
  CommentOperation.Delete.pipe(Operation.lazyHandler(() => import('./delete.ts'))),
  CommentOperation.DeleteMessage.pipe(Operation.lazyHandler(() => import('./delete-message.ts'))),
  CommentOperation.RespondToThread.pipe(Operation.lazyHandler(() => import('./respond-to-thread.ts'))),
  CommentOperation.Restore.pipe(Operation.lazyHandler(() => import('./restore.ts'))),
  CommentOperation.RestoreMessage.pipe(Operation.lazyHandler(() => import('./restore-message.ts'))),
  CommentOperation.Select.pipe(Operation.lazyHandler(() => import('./select.ts'))),
  CommentOperation.SetAgentConfig.pipe(Operation.lazyHandler(() => import('./set-agent-config.ts'))),
  CommentOperation.SetResolved.pipe(Operation.lazyHandler(() => import('./set-resolved.ts'))),
]);
