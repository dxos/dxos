//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ProjectCapabilities } from '#types';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [ProjectCapabilities.Template] },
  () => import('./templates'),
);
