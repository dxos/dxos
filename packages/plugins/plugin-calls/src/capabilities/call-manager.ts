//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { CallsServiceClient } from '@dxos/client/edge';
import { invariant } from '@dxos/invariant';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { CallsCapabilities } from '#types';

import { CallManager, createRealtimeKitTransport } from '../calls/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const registry = yield* Capabilities.AtomRegistry;
    const identity = yield* ClientCapabilities.IdentityService;
    client.config.getOrThrow('runtime.services.edge.url');
    const networkService = client.services.services.NetworkService;
    invariant(networkService, 'network service not found');
    const callManager = new CallManager({
      registry,
      identity,
      networkService,
      // Read per join: `client.edge` invariants while EDGE is unavailable, which must not fail the plugin's activation.
      createTransport: createRealtimeKitTransport(() => new CallsServiceClient(client.edge.http)),
    });
    yield* Effect.tryPromise(() => callManager.open());

    yield* Effect.addFinalizer(() => Effect.sync(() => void callManager.close()));
    return Capability.contribute(CallsCapabilities.Manager, callManager);
  }),
);
