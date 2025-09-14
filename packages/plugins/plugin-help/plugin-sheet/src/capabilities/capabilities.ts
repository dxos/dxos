//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import { type ComputeGraphRegistry } from '@dxos/compute';

import { SHEET_PLUGIN } from '../meta';

export namespace SheetCapabilities {
  export const ComputeGraphRegistry = defineCapability<ComputeGraphRegistry>(
    `${SHEET_PLUGIN}/capability/compute-graph-registry`,
  );
}
