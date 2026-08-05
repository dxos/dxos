//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
// The legacy pre-Channel thread object (plugin-review's comments); this plugin's own `Thread` is
// a thread of a channel feed.
import { Channel, Thread as LegacyThread, Message } from '@dxos/types';

import { ChannelBackendFeed, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Reaction, Thread } from '#types';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Channel.Channel, Message.Message, Reaction.Reaction, Thread.Thread, LegacyThread.Thread],
  }),
  Plugin.addModule({
    id: 'channel-backend-feed',
    activatesOn: ActivationEvents.Startup,
    activate: ChannelBackendFeed,
  }),
  Plugin.make,
);

export default ThreadPlugin;
