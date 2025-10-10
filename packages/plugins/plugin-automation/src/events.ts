//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace AutomationEvents {
  export const ComputeRuntimeReady = defineEvent(`${meta.id}/event/compute-runtime-ready`);
}


