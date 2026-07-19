//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Sheet } from '#types';

export const SheetPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Sheet.Sheet])),
  Plugin.make,
);

export default SheetPlugin;
