//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Harness } from '@dxos/assistant';
import { type LayerSpec } from '@dxos/compute';

//
// Capability Module
//
// Contributes the process-affinity `LayerSpec` that materialises
// {@link Harness.HarnessService} from the resolution context's `conversation` DXN.
//

// Annotated so the contributed `LayerSpec` type is nameable in the emitted declaration.
const harnessSpec: LayerSpec.LayerSpec = Harness.layerSpec;

export default Capability.makeModule(() => Effect.succeed(Capability.provide(Capabilities.LayerSpec, harnessSpec)));
