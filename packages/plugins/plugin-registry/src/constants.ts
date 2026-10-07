//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

/** Cascade-disable confirmation dialog surface id. */
export const DISABLE_DEPENDENTS_DIALOG = DXN.make(`${meta.profile.key}.disableDependentsDialog`);
