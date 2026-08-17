//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Workerd-specific implementations spliced into the generated barrel by `dx-plugin gen` in place of
// the canonical declarations: the headless environment registers the reduced schema list rather
// than the browser `./schema` module, and `OperationHandler` activates without the browser's `Idle`
// gate — a worker host has no post-interactive wave to wait for.
export const Schema = AppCapability.schema(() => import('../schema.headless'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
