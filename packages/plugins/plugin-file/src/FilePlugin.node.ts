//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Blob } from '@dxos/echo';

import { CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { File } from '#types';

export const FilePlugin = Plugin.define(meta).pipe(
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
  AppPlugin.addSchemaModule({ schema: [File.File, Blob.Blob] }),
  Plugin.make,
);

export default FilePlugin;
