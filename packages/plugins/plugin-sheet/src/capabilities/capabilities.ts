//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type ComputeGraphRegistry } from '@dxos/compute';

import { meta } from '../meta';

export namespace SheetCapabilities {
  export const ComputeGraphRegistry = defineCapability<ComputeGraphRegistry>(
    `${meta.id}/capability/compute-graph-registry`,
  );
}
