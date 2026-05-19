//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Game } from '#types';

export const GamePlugin = Plugin.define(meta).pipe(AppPlugin.addSchemaModule({ schema: [Game] }), Plugin.make);

export default GamePlugin;
