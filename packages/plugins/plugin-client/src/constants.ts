//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

export const JOIN_DIALOG = DXN.make(`${DXN.getName(meta.id)}.joinDialog`);
export const RECOVERY_CODE_DIALOG = DXN.make(`${DXN.getName(meta.id)}.recoveryCodeDialog`);
export const RESET_DIALOG = DXN.make(`${DXN.getName(meta.id)}.resetDialog`);
