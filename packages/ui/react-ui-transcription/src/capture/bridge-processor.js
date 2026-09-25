//
// Copyright 2026 DXOS.org
// Copyright 2026 Daniel Thompson-Yvetot
//

/* eslint-disable no-undef */

/**
 * Plays back PCM pushed from native code, so bridged audio re-enters the page as a normal audio node.
 *
 * Buffers arrive in bursts over the webview bridge while the graph pulls at a fixed rate, so frames
 * are queued and drained per render quantum; an empty queue emits silence rather than stalling.
 */
class BridgeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];
    this.offset = 0;
    this.port.onmessage = (event) => {
      this.queue.push(event.data);
      // Bound the backlog: if the page stalls, dropping the oldest audio keeps latency from growing
      // without limit. ~2s at 16 kHz in 128-frame quanta.
      while (this.queue.length > 250) {
        this.queue.shift();
      }
    };
  }

  process(_inputs, outputs) {
    const channel = outputs[0][0];
    let written = 0;

    while (written < channel.length && this.queue.length > 0) {
      const head = this.queue[0];
      const take = Math.min(channel.length - written, head.length - this.offset);
      channel.set(head.subarray(this.offset, this.offset + take), written);
      written += take;
      this.offset += take;
      if (this.offset >= head.length) {
        this.queue.shift();
        this.offset = 0;
      }
    }

    channel.fill(0, written);
    return true;
  }
}

registerProcessor('dxos-bridge-processor', BridgeProcessor);
