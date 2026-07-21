//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';

export const DeckPlugin = Plugin.define(meta).pipe(Plugin.addModule(OperationHandler), Plugin.make);

export default DeckPlugin;
