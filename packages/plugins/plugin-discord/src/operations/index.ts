//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { DiscordOperation } from '../types';

export const DiscordOperationHandlerSet = OperationHandlerSet.keyed([
  [DiscordOperation.GetDiscordChannels, () => import('./get-discord-channels')],
  [DiscordOperation.MaterializeDiscordTarget, () => import('./materialize-target')],
  [DiscordOperation.SyncDiscordChannel, () => import('./sync')],
  [DiscordOperation.CrawlDiscordChannels, () => import('./crawl')],
]);
