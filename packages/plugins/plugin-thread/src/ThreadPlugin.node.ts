//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Channel, Message, Thread } from '@dxos/types';

import { ChannelBackendFeed, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([Channel.Channel, Message.Message, Thread.Thread])),
  Plugin.addModule(ChannelBackendFeed),
  Plugin.make,
);

export default ThreadPlugin;
