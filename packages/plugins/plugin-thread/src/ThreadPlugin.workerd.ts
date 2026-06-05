//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Channel, Message, Thread } from '@dxos/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Channel.Channel, Message.Message, Thread.Thread],
  }),
  Plugin.make,
);

export default ThreadPlugin;
