//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Channel, Message, Thread } from '@dxos/types';

import { ChannelBackendFeed, CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({
    schema: [Channel.Channel, Message.Message, Thread.Thread],
  }),
  Plugin.addLazyModule(ChannelBackendFeed),
  Plugin.make,
);

export default ThreadPlugin;
