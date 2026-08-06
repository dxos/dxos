//
// Copyright 2024 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

export const SettingsPlugin = Plugin.lazy(meta, () => import('#plugin'));
