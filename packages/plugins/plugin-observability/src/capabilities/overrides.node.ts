//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ObservabilityOperation } from '#types';

// Node-specific implementation spliced into the generated barrel by `dx-plugin gen` in place of
// the canonical declaration: `SendEvent` drops its event for the same two reasons as the workerd
// variant (no non-browser transport, no way to read the user's telemetry preference); see the
// note in `overrides.workerd.ts`. Node has fewer platform constraints than workerd, so it can
// likely share whatever sink that gap is closed with.
// TODO(wittjosiah): Hook up.
export const OperationHandler = Capability.inlineModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () =>
    Effect.succeed([
      Capability.contribute(
        Capabilities.OperationHandler,
        OperationHandlerSet.make(Operation.withHandler(ObservabilityOperation.SendEvent, () => Effect.void)),
      ),
    ]),
);
