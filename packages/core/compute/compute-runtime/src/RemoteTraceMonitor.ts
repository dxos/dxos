//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';

import * as Trace from '@dxos/compute/Trace';
import { log } from '@dxos/log';

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

export class Service extends Context.Service<Service, Monitor>()('@dxos/compute-runtime/RemoteTraceMonitor') {}

/**
 * Empty remote trace source for local-only deployments (no swarm subscription).
 *
 * Exported by identity so a consumer can tell it apart from a real monitor: an EMPTY live source is
 * not the same as NO live source, and a reader that treats this one as live ends its subscription
 * the moment the empty stream completes.
 */
export const noopMonitor: Monitor = {
  subscribeToTraceMessages: () => Stream.empty,
};

/**
 * True for the monitor {@link layerNoop} provides, which carries no live source at all — consumers
 * fall back to whatever they do when the tag is unset rather than subscribing to it.
 */
export const isNoop = (monitor: Monitor): boolean => monitor === noopMonitor;

export const layerNoop: Layer.Layer<Service> = Layer.succeed(Service, noopMonitor);

/**
 * One received swarm broadcast: the `google.protobuf.Any.value` bytes of a `dxos.compute.TraceMessage`
 * plus the envelope's tag list. The tags are not just routing metadata — the wire payload drops ref
 * meta fields (`trigger`), so decode needs them to restore cancel addressing.
 */
export interface SwarmTraceBroadcast {
  readonly payload: Uint8Array;
  readonly tags?: readonly string[];
}

export interface SwarmRemoteTraceMonitorOptions {
  /**
   * Subscribe to broadcast trace messages on the swarm matching the coarse OR `tags` (DX-1125).
   * The caller owns the transport (typically the client's `NetworkService.subscribeMessages`); it
   * fails when it cannot deliver (no client yet, a dropped connection) and is resubscribed.
   */
  subscribe: (tags: string[]) => Stream.Stream<SwarmTraceBroadcast, unknown>;
}

/** Resubscribe delay after a transport failure; the next delivered broadcast resets it. */
const RESUBSCRIBE_BACKOFF = Schedule.min([Schedule.exponential('1 second'), Schedule.spaced('30 seconds')]).pipe(
  Schedule.jittered,
);

/**
 * Build a swarm-backed {@link Monitor} (DX-1125). Derives the coarse subscription tag from the filter,
 * subscribes over the injected transport, decodes each broadcast (restoring ref meta from the envelope
 * tags), and re-applies the exact filter. A failed subscription is retried with backoff for as long as
 * the consumer listens: remote progress has no other path to the client.
 */
export const createSwarmRemoteTraceMonitor = ({ subscribe }: SwarmRemoteTraceMonitorOptions): Monitor => ({
  subscribeToTraceMessages: (filter) => {
    const tag = Trace.subscriptionTagForFilter(filter);
    // Suspended so each retry opens a new subscription rather than replaying the failed one.
    return Stream.suspend(() => subscribe(tag ? [tag] : [])).pipe(
      Stream.tapError((error) =>
        Effect.sync(() => log.info('remote trace subscription failed; resubscribing', { error })),
      ),
      Stream.retry(RESUBSCRIBE_BACKOFF),
      // The backoff never ends, so a failure cannot reach here.
      Stream.orDie,
      Stream.map((message) => Trace.decodeTraceMessage(message.payload, message.tags)),
      Stream.filter((message) => Trace.matchesFilter(message, filter)),
    );
  },
});
