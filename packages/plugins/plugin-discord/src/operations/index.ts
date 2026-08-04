//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as DiscordOperation from '../types/DiscordOperation';

export const DiscordOperationHandlerSet = OperationHandlerSet.keyed([
  [DiscordOperation.GetDiscordChannels, () => import('./get-discord-channels')],
  [DiscordOperation.MaterializeDiscordTarget, () => import('./materialize-target')],
  [DiscordOperation.SyncDiscordChannel, () => import('./sync')],
  [DiscordOperation.CrawlDiscordChannels, () => import('./crawl')],
]);
