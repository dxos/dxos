//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Result from 'effect/Result';
import * as Stream from 'effect/Stream';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { RemoteTraceMonitor } from '@dxos/compute-runtime';
import * as Trace from '@dxos/compute/Trace';
import { log } from '@dxos/log';
import { createBuf, toPublicKey } from '@dxos/protocols/buf';
import { PeerSchema } from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type NetworkService } from '@dxos/protocols/rpc';

import { ClientCapabilities } from '#types';

/**
 * Builds the swarm broadcast subscription request. The peer must be a buf message: the RPC encoder
 * rejects a plain `{ peerKey }`, and the failed subscription would leave every remote meter silent.
 */
const createSubscribeRequest = (peerKey: string, tags: string[]): NetworkService.SubscribeMessagesRequest => ({
  peer: createBuf(PeerSchema, { peerKey }),
  tags,
});

/**
 * Contributes a swarm-backed {@link Capabilities.RemoteTraceMonitor} (DX-1125). Remote runtimes
 * (edge intrinsics / function-invoker) broadcast their ephemeral trace messages over the space swarm;
 * this monitor subscribes via the client's network service and decodes them so the aggregate
 * {@link Process.Manager.subscribeToTraceMessages} surfaces remote progress.
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
                const peerKey =
                  toPublicKey(client.halo.device?.deviceKey)?.toHex() ??
                  toPublicKey(client.halo.identity.get()?.identityKey)?.toHex() ??
                  '';
                return client.services.rpc['NetworkService.subscribeMessages'](
                  createSubscribeRequest(peerKey, tags),
                ).pipe(
                  // Carry the envelope tags with the payload — the wire payload drops ref meta
                  // (`trigger`), and decode restores it from the tags for cancel addressing.
                  // v4's `filterMap` signals the drop through a `Result`, not an `Option`.
                  // The subscription also receives this peer's point-to-point messages (Messenger's
                  // `ReliablePayload` / `Acknowledgement`), which are not trace broadcasts.
                  Stream.filterMap((message) =>
                    message.payload?.value && message.payload.typeUrl === Trace.TRACE_MESSAGE_TYPE_URL
                      ? Result.succeed({ payload: message.payload.value, tags: message.tags })
                      : Result.failVoid,
                  ),
                  // Never fail the aggregate monitor stream on a transient network error, but never hide
                  // one either: a subscription that dies here silences every remote progress meter.
                  Stream.catch((error) =>
                    Stream.fromEffect(
                      Effect.sync(() => log.warn('remote trace subscription failed', { tags, error })),
                    ).pipe(Stream.drain),
                  ),
                );
              }),
            ),
    });

    return Capability.contribute(Capabilities.RemoteTraceMonitor, monitor);
  }),
);
