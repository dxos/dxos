//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import config from '../dx.config.ts';

export const meta = Plugin.getMetaFromConfig(config);

export const MOVE_TASK_DIALOG = DXN.make(`${meta.profile.key}.moveTaskDialog`);
