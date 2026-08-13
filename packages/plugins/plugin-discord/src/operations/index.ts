//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DiscordOperation } from '#types';

export const DiscordOperationHandlerSet = OperationHandlerSet.lazy([
  DiscordOperation.GetDiscordChannels.pipe(Operation.lazyHandler(() => import('./get-discord-channels'))),
  DiscordOperation.MaterializeDiscordTarget.pipe(Operation.lazyHandler(() => import('./materialize-target'))),
  DiscordOperation.SyncDiscordChannel.pipe(Operation.lazyHandler(() => import('./sync'))),
  DiscordOperation.CrawlDiscordChannels.pipe(Operation.lazyHandler(() => import('./crawl'))),
]);
