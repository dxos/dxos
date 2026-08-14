//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { ChannelBackendFeed, OperationHandler, Schema } from '#capabilities';
import { meta } from '#meta';

export const ThreadPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(Schema),
  Plugin.addModule(ChannelBackendFeed),
  Plugin.make,
);

export default ThreadPlugin;
