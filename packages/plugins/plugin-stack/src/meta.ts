//
// Copyright 2023 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import config from '../dx.config.ts';

export const SECTION_IDENTIFIER = DXN.make('org.dxos.type.stackSection');

export const meta = Plugin.getMetaFromConfig(config);
