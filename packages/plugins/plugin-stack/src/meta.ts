//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

import config from '../dx.config';

export const SECTION_IDENTIFIER = DXN.make('org.dxos.type.stackSection');

export const meta = Plugin.getMetaFromConfig(config);
