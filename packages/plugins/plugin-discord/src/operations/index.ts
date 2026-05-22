//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const DiscordOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./get-discord-channels'),
  () => import('./get-discord-user-channels'),
  () => import('./sync'),
);
