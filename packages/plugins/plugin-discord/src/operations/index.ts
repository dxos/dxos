//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const DiscordOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./get-discord-channels'),
  () => import('./materialize-target'),
  () => import('./sync'),
  () => import('./crawl'),
);
