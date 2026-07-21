//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Trace } from '@dxos/compute';

export interface SwarmTraceSinkOptions {
  /**
   * Publish an encoded ephemeral trace message to the swarm for `space`, tagged for subscriber
   * matching (DX-1125). Fire-and-forget. The caller owns the space → swarm-key mapping and transport:
   *   - client / local runtime: `SignalManager.sendMessage` with broadcast `tags` over the WebSocket;
   *   - edge runtime: a direct `env.SWARM.idFromName(swarmKey).publish(...)` DO call.
   */
  publish: (params: { space: string; tags: string[]; payload: Uint8Array }) => void;
}

/**
 * A {@link Trace.Sink} that broadcasts ephemeral trace messages over the space swarm (DX-1125).
 *
 * It is the inverse of the feed sink: durable messages are ignored here (they are persisted to the
 * feed), while ephemeral messages — progress, status, input/output previews — are published so
 * subscribed clients can project them into live progress UI. Messages with no space cannot be
 * addressed to a swarm and are dropped.
 */
export const createSwarmTraceSink = ({ publish }: SwarmTraceSinkOptions): Trace.Sink => ({
  write: (message) => {
    if (!message.isEphemeral) {
      return;
    }
    const space = message.meta.space;
    if (!space) {
      return;
    }
    publish({ space, tags: Trace.messageToTags(message), payload: Trace.encodeTraceMessage(message) });
  },
});
