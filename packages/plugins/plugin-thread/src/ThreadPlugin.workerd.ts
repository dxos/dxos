//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Channel, Message, Thread } from '@dxos/types';

import { ChannelBackendFeed, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Channel.Channel, Message.Message, Thread.Thread])),
  Plugin.addModule(ChannelBackendFeed),
  Plugin.make,
);

export default ThreadPlugin;
