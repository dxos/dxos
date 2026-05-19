//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const FilesPlugin = Plugin.define(meta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.make,
);

export default FilesPlugin;
