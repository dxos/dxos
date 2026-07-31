//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { Game } from '#types';

export const GamePlugin = Plugin.define(meta).pipe(Plugin.addModule(AppCapability.schema([Game.Game])), Plugin.make);

export default GamePlugin;
