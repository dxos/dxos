//
// Copyright 2024 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { WnfsFile } from '#types';

export const WnfsPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [WnfsFile.WnfsFile] }),
  Plugin.make,
);

export default WnfsPlugin;
