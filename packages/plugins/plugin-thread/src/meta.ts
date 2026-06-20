//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import config from '../dx.config';

export const meta = Plugin.getMetaFromConfig(config);

export const THREAD_ITEM = `${meta.profile.key}.item`;
