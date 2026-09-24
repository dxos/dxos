//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import config from '../dx.config.ts';

export const meta = Plugin.getMetaFromConfig(config);

export const SEARCH_RESULT = `${meta.profile.key}.result`;
