//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Capabilities, Capability } from '@dxos/app-framework';
import { RemoteTraceMonitor } from '@dxos/compute-runtime';

import { ClientCapabilities } from '#types';

/**
 * Contributes a swarm-backed {@link Capabilities.RemoteTraceMonitor} (DX-1125). Remote runtimes
 * (edge intrinsics / function-invoker) broadcast their ephemeral trace messages over the space swarm;
 * this monitor subscribes via the client's network service and decodes them so the aggregate
 * {@link Process.Monitor.subscribeToTraceMessages} surfaces remote progress.
 *
 * The client is resolved lazily inside the subscribe closure (invoked only when a consumer
 * subscribes, well after `ClientReady`), so this module can be collected at `SetupProcessManager`
 * before the client capability exists.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;

    const monitor = RemoteTraceMonitor.createSwarmRemoteTraceMonitor({
      subscribe: (tags) =>
        // Empty tag set matches nothing (avoids a firehose) — skip the subscription entirely.
        tags.length === 0
          ? Stream.empty
          : Stream.unwrap(
              Effect.sync(() => {
                const client = capabilityManager.getAll(ClientCapabilities.Client)[0];
                if (!client) {
                  return Stream.empty;
                }
                // The subscribing peer is nominal for broadcasts: the edge keys the subscription off
                // the WebSocket connection, not this object; it only affects point-to-point filtering.
                const peer = {
                  peerKey:
                    client.halo.device?.deviceKey.toHex() ?? client.halo.identity.get()?.identityKey.toHex() ?? '',
                };
                return client.services.rpc.NetworkService.subscribeMessages({ peer, tags }).pipe(
                  Stream.filterMap((message) =>
                    message.payload?.value ? Option.some(message.payload.value) : Option.none(),
                  ),
                  // Never fail the aggregate monitor stream on a transient network error.
                  Stream.catchAll(() => Stream.empty),
                );
              }),
            ),
    });

    return Capability.contributes(Capabilities.RemoteTraceMonitor, monitor);
  }),
);
