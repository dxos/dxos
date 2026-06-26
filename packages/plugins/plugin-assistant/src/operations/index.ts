//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const AssistantOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-chat'),
  () => import('./ensure-companion-chat'),
  () => import('./fork-chat'),
  () => import('./generate-home-suggestions'),
  () => import('./resolve-navigation-targets'),
  () => import('./run-prompt-in-new-chat'),
  () => import('./set-current-chat'),
  () => import('./toggle-trace-panel-debug'),
  () => import('./update-chat-name'),
);
