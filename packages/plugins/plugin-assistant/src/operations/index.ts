//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as AssistantOperation from './definitions';

export const AssistantOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-chat'),
  () => import('./on-create-space'),
  () => import('./run-prompt-in-new-chat'),
  () => import('./set-current-chat'),
  () => import('./update-chat-name'),
);
