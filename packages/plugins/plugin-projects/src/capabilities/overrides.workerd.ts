//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { ProjectCapabilities } from '#types';

// Workerd-specific implementations spliced into the generated barrel by `dx-plugin gen` in place of
// the canonical declarations: the headless environment registers the reduced schema list rather
// than the browser `./schema` module, and both `OperationHandler` and `Templates` activate without
// the browser's gate — a worker host has no `Idle`/`ProjectsEvents.Start` wave to wait for.
export const Schema = AppCapability.schema(() => import('../schema.headless'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [ProjectCapabilities.Template] },
  () => import('./templates'),
);
