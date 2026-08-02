//
// Copyright 2023 DXOS.org
//

// NOTE: This module is in every plugin stub's eager graph (`plugin.ts` → `./meta`) — it must stay
// free of heavy imports; graph-path helpers live in `./paths`.

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

import config from '../dx.config';

export const meta = Plugin.getMetaFromConfig(config);

/** Cascade-disable confirmation dialog surface id. */
export const DISABLE_DEPENDENTS_DIALOG = DXN.make(`${meta.profile.key}.disableDependentsDialog`);
