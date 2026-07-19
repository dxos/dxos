//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Game } from '#types';

export const GamePlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.schema([Game.Game])),
  Plugin.make,
);

export default GamePlugin;
