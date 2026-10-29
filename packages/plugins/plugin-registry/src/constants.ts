//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { RegistryNamespace } from './namespace.ts';

/** Cascade-disable confirmation dialog surface id. */
export const DISABLE_DEPENDENTS_DIALOG = DXN.make(`${RegistryNamespace.key}.disableDependentsDialog`);
