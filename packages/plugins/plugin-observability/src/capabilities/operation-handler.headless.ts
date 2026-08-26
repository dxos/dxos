//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ObservabilityOperation } from '#types';

// TODO(wittjosiah): Make observability actually work outside the browser. `SendEvent` drops its
//   event here because neither half of the browser implementation ports to a headless host:
//   1. Transport — `@dxos/observability` is browser-only (posthog-js, @dxos/client, localforage,
//      zone.js, the OTel *-web SDKs), and its PostHog extension already stubs itself off-window. A
//      headless host needs a thin `fetch`-based sink (PostHog capture, the invocation's trace sink,
//      or OTLP) rather than a port of that package.
//   2. Consent — the browser handler reaches the `Observability` capability, which gates on the
//      user's telemetry setting and the privacy notice. A headless host has no such state, and
//      `invokeOperation` carries no caller identity to look it up by, so there is currently no way
//      to honour an opt-out. Sending events before that is resolved would leak past the user's
//      choice; dropping them is the conservative default.
//   NOTE: The real handler cannot simply be used here — it resolves the capability with
//   `Capability.waitFor`, which never settles when nothing contributes it, hanging the invocation.
//   Node has fewer platform constraints than workerd, so it can likely share whatever sink closes
//   this gap.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      Capabilities.OperationHandler,
      OperationHandlerSet.make(Operation.withHandler(ObservabilityOperation.SendEvent, () => Effect.void)),
    );
  }),
);
