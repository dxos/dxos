//
// Copyright 2025 DXOS.org
//

// Node/CLI capabilities entry point.
// Only exports capabilities that work in headless environments (no React, no browser APIs).
// The `#capabilities` import resolves to this file in Node.js contexts.

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
