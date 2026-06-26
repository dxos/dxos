//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

import config from '../dx.config';

export const meta = Plugin.getMetaFromConfig(config);

export const QUICK_ENTRY_DIALOG = DXN.make(`${meta.profile.key}.quickEntryDialog`);
