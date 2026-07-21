//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { Trace } from '@dxos/compute';

/**
 * Source of ephemeral trace messages broadcast by remote runtimes over the space swarm (DX-1125).
 *
 * Interface only: the swarm-backed implementation is provided where the client's network service is
 * available (app-framework / client). Provide {@link layerNoop} for local-only deployments.
 */
export interface Monitor {
  /**
   * Stream remote ephemeral trace messages matching `filter`. Implementations derive a coarse swarm
   * subscription tag from the filter and re-apply the exact filter to decoded messages.
   */
  subscribeToTraceMessages(filter: Trace.Filter): Stream.Stream<Trace.Message>;
}

export class Service extends Context.Tag('@dxos/compute-runtime/RemoteTraceMonitor')<Service, Monitor>() {}

/**
 * Empty remote trace source for local-only deployments (no swarm subscription).
 */
export const layerNoop: Layer.Layer<Service> = Layer.succeed(Service, {
  subscribeToTraceMessages: () => Stream.empty,
});

export interface SwarmRemoteTraceMonitorOptions {
  /**
   * Subscribe to broadcast trace payloads on the swarm matching the coarse OR `tags` (DX-1125).
   * Yields the raw `google.protobuf.Any.value` bytes of each broadcast (a `dxos.compute.TraceMessage`).
   * The caller owns the transport (typically the client's `NetworkService.subscribeMessages`).
   */
  subscribe: (tags: string[]) => Stream.Stream<Uint8Array>;
}

/**
 * Build a swarm-backed {@link Monitor} (DX-1125). Derives the coarse subscription tag from the filter,
 * subscribes over the injected transport, decodes each broadcast, and re-applies the exact filter.
 */
export const createSwarmRemoteTraceMonitor = ({ subscribe }: SwarmRemoteTraceMonitorOptions): Monitor => ({
  subscribeToTraceMessages: (filter) => {
    const tag = Trace.subscriptionTagForFilter(filter);
    return subscribe(tag ? [tag] : []).pipe(
      Stream.map((bytes) => Trace.decodeTraceMessage(bytes)),
      Stream.filter((message) => Trace.matchesFilter(message, filter)),
    );
  },
});
