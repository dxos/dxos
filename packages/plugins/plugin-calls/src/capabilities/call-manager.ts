//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { CallsCapabilities } from '#types';

import { CallManager } from '../calls/index.ts';

// CallManager/CallTransport move as a set with the ReactRoot: its components read the manager
// via strict useCapability, so the three must share an activation event. The manager's
// constructor and open() read `client.services`/`client.config` (initialized-only), which the
// startup pass no longer implies — the trio rides the client-initialized event instead.
// Browser-only, with the transport below: the manager drives a WebRTC session against the edge
// calling service and reads `runtime.services.edge.url` in its constructor, so activating it
// anywhere that config is absent fails the module and auto-disables the whole plugin.
export const CallsCallManager = Capability.makeModule(
  'CallManager',
  {
    requires: [ClientCapabilities.Client, Capabilities.AtomRegistry, ClientCapabilities.IdentityService],
    provides: [CallsCapabilities.Manager],
    activatesOn: ClientEvents.Initialized,
    environments: [],
  },
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;
    const haloIdentity = yield* ClientCapabilities.IdentityService;
    const callManager = new CallManager(client, registry, haloIdentity);
    yield* Effect.tryPromise(() => callManager.open());

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        void callManager.close();
      }),
    );
    return Capability.contribute(CallsCapabilities.Manager, callManager);
  }),
);
