//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import { meta } from '#meta';

export const PresenterPlugin = Plugin.define(meta).pipe(Plugin.make);

export default PresenterPlugin;
