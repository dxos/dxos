//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { type ComputeGraphRegistry } from '@dxos/compute';

import { meta } from '../meta';

export namespace SheetCapabilities {
  export const ComputeGraphRegistry = Capability.make<ComputeGraphRegistry>(
    `${meta.id}/capability/compute-graph-registry`,
  );
}
