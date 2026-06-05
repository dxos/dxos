//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AnchoredTo, Channel, Message, Thread } from '@dxos/types';

import { ChannelBackendFeed, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Channel.Channel, Message.Message, Thread.Thread],
  }),
  Plugin.addModule({
    id: 'channel-backend-feed',
    activatesOn: ActivationEvents.Startup,
    activate: ChannelBackendFeed,
  }),
  Plugin.make,
);

export default ThreadPlugin;
