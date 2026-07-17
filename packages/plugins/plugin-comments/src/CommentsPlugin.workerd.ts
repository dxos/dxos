//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const CommentsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({
    schema: [AnchoredTo.AnchoredTo, Message.Message, Thread.Thread],
  }),
  Plugin.make,
);

export default CommentsPlugin;
