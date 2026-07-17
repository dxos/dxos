//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { SampleItem } from '#types';

export const SamplePlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({ schema: [SampleItem.SampleItem] }),
  Plugin.make,
);

export default SamplePlugin;
