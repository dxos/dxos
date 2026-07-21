//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { AppGraphBuilder, OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const NavTreePlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(OperationHandler),
  Plugin.make,
);

export default NavTreePlugin;
