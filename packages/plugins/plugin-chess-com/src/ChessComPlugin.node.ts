//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { CreateObject, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { ChessComAccount } from '#types';

export const ChessComPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(CreateObject),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(AppCapability.schema([ChessComAccount.Account])),
  Plugin.make,
);

export default ChessComPlugin;
