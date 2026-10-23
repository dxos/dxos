//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { DiscordAdminOperation, DiscordAgentOperation, DiscordOperation } from '#types';

export const DiscordOperationHandlerSet = OperationHandlerSet.lazy([
  DiscordOperation.GetDiscordChannels.pipe(Operation.lazyHandler(() => import('./get-discord-channels.ts'))),
  DiscordOperation.MaterializeDiscordTarget.pipe(Operation.lazyHandler(() => import('./materialize-target.ts'))),
  DiscordOperation.SyncDiscordChannel.pipe(Operation.lazyHandler(() => import('./sync.ts'))),
  DiscordOperation.CrawlDiscordChannels.pipe(Operation.lazyHandler(() => import('./crawl.ts'))),
  DiscordOperation.ConfigureBackIndex.pipe(Operation.lazyHandler(() => import('./configure-back-index.ts'))),
  DiscordAdminOperation.ListManagedGuilds.pipe(Operation.lazyHandler(() => import('./admin/list-managed-guilds.ts'))),
  DiscordAdminOperation.ListBotGuilds.pipe(Operation.lazyHandler(() => import('./admin/list-bot-guilds.ts'))),
  DiscordAdminOperation.ListGuildChannels.pipe(Operation.lazyHandler(() => import('./admin/list-guild-channels.ts'))),
  DiscordAdminOperation.ListBindings.pipe(Operation.lazyHandler(() => import('./admin/list-bindings.ts'))),
  DiscordAdminOperation.BindChannel.pipe(Operation.lazyHandler(() => import('./admin/bind-channel.ts'))),
  DiscordAdminOperation.UnbindChannel.pipe(Operation.lazyHandler(() => import('./admin/unbind-channel.ts'))),
  DiscordAgentOperation.Reply.pipe(Operation.lazyHandler(() => import('./agent/reply.ts'))),
  DiscordAgentOperation.DirectMessage.pipe(Operation.lazyHandler(() => import('./agent/direct-message.ts'))),
  DiscordAgentOperation.React.pipe(Operation.lazyHandler(() => import('./agent/react.ts'))),
]);
