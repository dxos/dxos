//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Channel, Message, Thread } from '@dxos/types';

import { ChannelBackendFeed, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Channel.Channel, Message.Message, Thread.Thread])),
  Plugin.addLazyModule(ChannelBackendFeed),
  Plugin.make,
);

export default ThreadPlugin;
