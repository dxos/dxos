//
// Copyright 2026 DXOS.org
//

/* eslint-disable no-undef */

/**
 * Forwards raw mono PCM frames from the audio render thread to the recorder on the main thread.
 *
 * Plain JavaScript, loaded by `audioWorklet.addModule`: worklet globals (`AudioWorkletProcessor`,
 * `registerProcessor`, `sampleRate`) exist only inside the worklet scope, and the module is fetched
 * as a URL rather than bundled into the page.
 */
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    // A disconnected or silent-but-live source yields no channel data; returning true keeps the
    // processor alive so capture resumes if the track starts producing again.
    if (channel && channel.length > 0) {
      // Copied: the render quantum's buffer is reused across calls.
      this.port.postMessage(channel.slice());
    }

    return true;
  }
}

registerProcessor('dxos-pcm-processor', PcmProcessor);
