//
// Copyright 2025 DXOS.org
//

import { synchronized } from '@dxos/async';
import { log } from '@dxos/log';
import { type AudioChunk, type AudioRecorder, type WavConfig } from '@dxos/pipeline-transcription';

/** Name the worklet registers itself under; must match `pcm-processor.js`. */
const PROCESSOR_NAME = 'dxos-pcm-processor';

/** Fallback buffer size (frames) when `ScriptProcessorNode` stands in for the worklet. */
const SCRIPT_PROCESSOR_BUFFER_SIZE = 4096;

/** Full-scale value for the 16-bit PCM the transcription pipeline expects. */
const INT16_SCALE = 0x7fff;

export type MediaStreamRecorderProps = {
  mediaStreamTrack: MediaStreamTrack;
  config: {
    interval: number;
  };
};

/**
 * Records a microphone track to 16-bit PCM chunks.
 *
 * Capture is done directly against the Web Audio graph rather than through a `MediaRecorder` WAV
 * polyfill. The polyfill produced empty buffers under WebKit — Safari, and therefore the Tauri
 * webview on both macOS and iOS — while working in Chromium, which made transcription look like a
 * service failure: audio was captured, uploaded and answered, but the upload was a bare WAV header.
 * Owning the graph also means owning the {@link AudioContext}, which is what lets us resume it:
 * WebKit starts every context suspended, and a suspended context feeds an audio node nothing.
 */
export class MediaStreamRecorder implements AudioRecorder {
  private readonly _mediaStreamTrack: MediaStreamTrack;
  private readonly _config: MediaStreamRecorderProps['config'];
  private _onChunk?: (chunk: AudioChunk) => void;

  private _context?: AudioContext = undefined;
  private _source?: MediaStreamAudioSourceNode = undefined;
  private _node?: AudioWorkletNode | ScriptProcessorNode = undefined;
  private _flushTimer?: ReturnType<typeof setInterval> = undefined;

  /** Frames captured since the last flush, in render-quantum sized pieces. */
  private _pending: Float32Array[] = [];
  private _pendingLength = 0;
  private _chunkStartedAt = 0;

  constructor({ mediaStreamTrack, config }: MediaStreamRecorderProps) {
    this._mediaStreamTrack = mediaStreamTrack;
    this._config = config;
  }

  /**
   * Reported from the {@link AudioContext}, not the track: the context is what actually resamples
   * the input, so its rate is the one the captured samples are at.
   */
  get wavConfig(): WavConfig {
    return {
      channels: 1,
      sampleRate: this._context?.sampleRate ?? this._mediaStreamTrack.getSettings().sampleRate ?? 48_000,
      bitDepthCode: '16',
    };
  }

  get mediaStreamTrack() {
    return this._mediaStreamTrack;
  }

  setOnChunk(onChunk: (chunk: AudioChunk) => void): void {
    this._onChunk = onChunk;
  }

  // `@synchronized` serializes start/stop so a rapid stop→start cycle (e.g. React StrictMode's
  // double-mount) cannot build a second graph over a context that is still tearing down.
  @synchronized
  async start(): Promise<void> {
    if (this._context) {
      return;
    }

    const context = new AudioContext();
    let source: MediaStreamAudioSourceNode;
    let node: AudioWorkletNode | ScriptProcessorNode;
    try {
      // WebKit hands back a suspended context and only a user gesture may resume it. Recording always
      // begins from a tap, so this resolves — but without it every downstream node receives silence,
      // which is indistinguishable from a muted microphone.
      if (context.state === 'suspended') {
        await context.resume();
      }

      source = context.createMediaStreamSource(new MediaStream([this._mediaStreamTrack]));
      node = await this.#createCaptureNode(context);
      source.connect(node);
      // The worklet emits nothing, but Chromium only pulls a graph that reaches a destination; a zeroed
      // gain keeps the microphone from being played back to the user.
      const sink = context.createGain();
      sink.gain.value = 0;
      node.connect(sink);
      sink.connect(context.destination);
    } catch (err) {
      // The context is not held on the instance until setup succeeds, so close it here or it leaks.
      await context.close().catch(() => {});
      throw err;
    }

    this._context = context;
    this._source = source;
    this._node = node;
    this._pending = [];
    this._pendingLength = 0;
    this._chunkStartedAt = Date.now();
    this._flushTimer = setInterval(() => this.#flush(), this._config.interval);
  }

  @synchronized
  async stop(): Promise<void> {
    if (!this._context) {
      return;
    }

    if (this._flushTimer !== undefined) {
      clearInterval(this._flushTimer);
      this._flushTimer = undefined;
    }
    // Emit whatever the final interval captured before tearing the graph down, so the tail of an
    // utterance is not dropped on stop.
    this.#flush();

    this._node?.disconnect();
    this._source?.disconnect();
    const context = this._context;
    this._node = undefined;
    this._source = undefined;
    this._context = undefined;
    await context.close();
  }

  /**
   * Prefers an {@link AudioWorkletNode}, whose processing runs off the main thread. Falls back to the
   * deprecated `ScriptProcessorNode` when the worklet module cannot be loaded — a bundler that does
   * not emit it, or a page whose CSP refuses the fetch — because a deprecated capture path is worth
   * more than none, and the previous silent failure is exactly what this replaces.
   */
  async #createCaptureNode(context: AudioContext): Promise<AudioWorkletNode | ScriptProcessorNode> {
    try {
      await context.audioWorklet.addModule(new URL('./pcm-processor.js', import.meta.url));
      const node = new AudioWorkletNode(context, PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
      });
      node.port.onmessage = (event: MessageEvent<Float32Array>) => this.#collect(event.data);
      return node;
    } catch (err) {
      log.warn('audio worklet unavailable; falling back to ScriptProcessorNode', { err });
      const node = context.createScriptProcessor(SCRIPT_PROCESSOR_BUFFER_SIZE, 1, 1);
      node.onaudioprocess = (event) => this.#collect(new Float32Array(event.inputBuffer.getChannelData(0)));
      return node;
    }
  }

  #collect(frames: Float32Array): void {
    this._pending.push(frames);
    this._pendingLength += frames.length;
  }

  /**
   * Emits the frames captured since the last flush as one chunk, converted to the 16-bit PCM the
   * pipeline merges with `wavefile`. Values are integers held in a `Float64Array` because that is
   * what {@link AudioChunk} carries.
   */
  #flush(): void {
    if (this._pendingLength === 0 || !this._onChunk) {
      return;
    }

    const frames = this._pending;
    const length = this._pendingLength;
    this._pending = [];
    this._pendingLength = 0;

    const samples = new Float64Array(length);
    let offset = 0;
    for (const frame of frames) {
      for (let index = 0; index < frame.length; index++) {
        // Clamped before scaling: a sample slightly outside [-1, 1] would wrap when written as int16.
        const value = Math.max(-1, Math.min(1, frame[index]));
        samples[offset + index] = Math.round(value * INT16_SCALE);
      }
      offset += frame.length;
    }

    const timestamp = this._chunkStartedAt;
    this._chunkStartedAt = Date.now();
    this._onChunk({ timestamp, data: samples });
  }
}
