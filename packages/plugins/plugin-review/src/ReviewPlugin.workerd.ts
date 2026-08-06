//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AnchoredTo, Message, Thread } from '@dxos/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const ReviewPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([AnchoredTo.AnchoredTo, Message.Message, Thread.Thread])),
  Plugin.make,
);

export default ReviewPlugin;
