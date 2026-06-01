//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

// import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Magazine, Subscription } from '#types';

export const FeedPlugin = Plugin.define(meta).pipe(
  // AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Subscription.Subscription, Subscription.Post, Subscription.PostContent, Magazine.Magazine],
  }),
  Plugin.make,
);

export default FeedPlugin;
