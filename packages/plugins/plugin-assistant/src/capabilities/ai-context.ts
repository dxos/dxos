//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Harness } from '@dxos/assistant';
import type * as LayerSpec from '@dxos/compute/LayerSpec';

//
// Capability Module
//
// Contributes the process-affinity `LayerSpec` that materialises
// {@link Harness.HarnessService} from the resolution context's `conversation` DXN.
//

// Annotated so the contributed `LayerSpec` type is nameable in the emitted declaration.
const harnessSpec: LayerSpec.LayerSpec = Harness.layerSpec;

export const AiContext = AppCapability.layerSpec(
  () => Effect.succeed(Capability.contribute(Capabilities.LayerSpec, harnessSpec)),
  {
    name: 'AiContext',
  },
);
