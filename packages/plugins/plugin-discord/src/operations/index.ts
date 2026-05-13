//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const DiscordOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./create-bot'),
  () => import('./set-token'),
  () => import('./disconnect-guild'),
);
