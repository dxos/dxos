//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { Translations } from '#capabilities';
import { meta } from '#meta';

export const HandpanPlugin = Plugin.define(meta).pipe(Plugin.addModule(Translations), Plugin.make);

export default HandpanPlugin;
