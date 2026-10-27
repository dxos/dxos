//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { CallsCapabilities } from '#types';

import { bindCallEvents } from '../calls/index.ts';

/** Delivers the call manager's lifecycle and state to the contributed `EventHandler`s. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const callManager = yield* CallsCapabilities.Manager;
    const handlers = yield* Capability.atom(CallsCapabilities.EventHandler);
    const unbind = bindCallEvents({ registry, source: callManager, handlers });
    yield* Effect.addFinalizer(() => Effect.sync(unbind));
    return [];
  }),
);
