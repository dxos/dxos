//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta } from './meta';

export const TemplatePlugin = Plugin.lazy(meta, () => import('#plugin'));
