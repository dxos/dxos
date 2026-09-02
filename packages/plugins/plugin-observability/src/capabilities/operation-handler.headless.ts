//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ObservabilityOperation } from '#types';

// TODO(wittjosiah): Give workerd a transport. `@dxos/observability`'s extensions are posthog-js
//   (browser) and posthog-node (node); workerd has neither, and its invocations carry no caller
//   identity to attribute events to, so `SendEvent` drops them rather than sending them
//   unattributed. Node reaches the real handler — see `#operation-handler` in package.json.
//   NOTE: The real handler cannot simply be used here — it resolves the capability with
//   `Capability.waitFor`, which never settles when nothing contributes it, hanging the invocation.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      Capabilities.OperationHandler,
      OperationHandlerSet.make(Operation.withHandler(ObservabilityOperation.SendEvent, () => Effect.void)),
    );
  }),
);
