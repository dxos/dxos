//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { FileType } from '#types';

export const FilePlugin = Plugin.define(meta).pipe(
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [FileType.FileType] }),
  Plugin.make,
);

export default FilePlugin;
