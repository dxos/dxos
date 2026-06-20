//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Channel, Message, Thread } from '@dxos/types';

import { ChannelBackendFeed, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Channel.Channel, Message.Message, Thread.Thread],
  }),
  Plugin.addModule({
    id: 'channel-backend-feed',
    activatesOn: ActivationEvents.Startup,
    activate: ChannelBackendFeed,
  }),
  Plugin.make,
);

export default ThreadPlugin;
