//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace AutomationEvents {
  export const ComputeRuntimeReady = ActivationEvent.make(`${meta.id}/event/compute-runtime-ready`);
}
