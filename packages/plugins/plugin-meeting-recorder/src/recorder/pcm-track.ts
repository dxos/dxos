//
// Copyright 2026 DXOS.org
//

/**
 * Turns pushed PCM chunks into a live `MediaStreamTrack`, so system audio from the native side feeds
 * the same `TranscriptionManager.setAudioTrack` path as a microphone. Each chunk is scheduled back to
 * back on the context clock; no worklet module is needed, which the desktop CSP would not load.
 */
/** How far ahead of the context clock pushed audio may be scheduled. */
const MAX_QUEUED_SECONDS = 2;

export class PcmTrackSource {
  readonly #context: AudioContext;
  readonly #destination: MediaStreamAudioDestinationNode;
  #nextStartTime = 0;

  constructor(sampleRate: number) {
    this.#context = new AudioContext({ sampleRate });
    this.#destination = this.#context.createMediaStreamDestination();
  }

  /**
   * A context created outside a user gesture (an auto-started recording) starts suspended, and a
   * suspended context's clock stands still, so nothing would ever play into the track.
   */
  async resume(): Promise<void> {
    if (this.#context.state === 'suspended') {
      await this.#context.resume();
    }
  }

  get track(): MediaStreamTrack {
    return this.#destination.stream.getAudioTracks()[0];
  }

  push(samples: Float32Array): void {
    if (samples.length === 0 || this.#context.state === 'closed') {
      return;
    }

    const buffer = this.#context.createBuffer(1, samples.length, this.#context.sampleRate);
    buffer.getChannelData(0).set(samples);
    const source = this.#context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.#destination);
    // A stall that lets the queue run this far ahead of the clock is dropped rather than buffered.
    if (this.#nextStartTime - this.#context.currentTime > MAX_QUEUED_SECONDS) {
      return;
    }
    // A late chunk starts now rather than in the past, so a stall shifts audio instead of dropping it.
    const startTime = Math.max(this.#nextStartTime, this.#context.currentTime);
    source.start(startTime);
    this.#nextStartTime = startTime + buffer.duration;
  }

  async close(): Promise<void> {
    this.track?.stop();
    if (this.#context.state !== 'closed') {
      await this.#context.close();
    }
  }
}
