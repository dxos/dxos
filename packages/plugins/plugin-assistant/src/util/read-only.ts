//
// Copyright 2026 DXOS.org
//

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

/** Whether the host contributes {@link AppCapabilities.ReadOnly}; read when the work runs, not when a module activates. */
export const isReadOnly = (manager: CapabilityManager.CapabilityManager): boolean =>
  manager.getAll(AppCapabilities.ReadOnly).length > 0;
