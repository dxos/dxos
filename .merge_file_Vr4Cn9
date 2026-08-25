//
// Copyright 2025 DXOS.org
//

import { type IBlobEvent, type IMediaRecorder } from 'extendable-media-recorder';
import { WaveFile } from 'wavefile';

import { synchronized } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type AudioChunk, type AudioRecorder, type WavConfig } from '@dxos/pipeline-transcription';

// `extendable-media-recorder` references browser-only globals (Worker/AudioWorklet) at module load,
// so it is imported lazily — keeping this package importable in non-browser contexts (node tests,
// Cloudflare Workers) where the recorder is never started.
let MediaRecorderClass: typeof import('extendable-media-recorder').MediaRecorder | undefined;
let initializingPromise: Promise<void> | undefined;

const initializeExtendableMediaRecorder = async () => {
  const { MediaRecorder, register } = await import('extendable-media-recorder');
  const { connect } = await import('extendable-media-recorder-wav-encoder');
  await register(await connect());
  MediaRecorderClass = MediaRecorder;
};

export type MediaStreamRecorderProps = {
  mediaStreamTrack: MediaStreamTrack;
  config: {
    interval: number;
  };
};

/**
 * Recorder that uses the MediaContext API and AudioNode API to record audio.
 *
 * It records MediaStream using https://www.npmjs.com/package/extendable-media-recorder.
 */
export class MediaStreamRecorder implements AudioRecorder {
  private readonly _mediaStreamTrack: MediaStreamTrack;
  /**
   * Default MediaRecorder implementation do not support wav encoding.
   */
  private readonly _config: MediaStreamRecorderProps['config'];
  private _mediaRecorder?: IMediaRecorder = undefined;
  private _header?: Uint8Array = undefined;
  private _onChunk?: (chunk: AudioChunk) => void;

  constructor({ mediaStreamTrack, config }: MediaStreamRecorderProps) {
    this._mediaStreamTrack = mediaStreamTrack;
    this._config = config;
  }

  get wavConfig(): WavConfig {
    const settings = this._mediaStreamTrack.getSettings();
    return {
      channels: settings.channelCount ?? 1,
      sampleRate: settings.sampleRate ?? 16000,
      bitDepthCode: settings.sampleSize ? String(settings.sampleSize) : '16',
    };
  }

  get mediaStreamTrack() {
    return this._mediaStreamTrack;
  }

  setOnChunk(onChunk: (chunk: AudioChunk) => void): void {
    this._onChunk = onChunk;
  }

  // `@synchronized` serializes start/stop (they share the instance lock) so a rapid stop→start cycle
  // (e.g. React StrictMode double-mount) cannot initiate a new WAV encoding before the previous one
  // has flushed — which throws "Another request was made to initiate an encoding" and kills capture.
  @synchronized
  async start(): Promise<void> {
    await (initializingPromise ??= initializeExtendableMediaRecorder()).catch((err) =>
      log.info('initializeExtendableMediaRecorder', { err }),
    );

    if (this._mediaRecorder?.state === 'recording') {
      return;
    }
    invariant(this._onChunk, 'MediaStreamRecorder: onChunk is not set');
    invariant(MediaRecorderClass, 'MediaStreamRecorder: extendable-media-recorder not initialized');
    // Fresh recorder per session so a previously-stopped (encoder-flushed) instance is never reused.
    const stream = new MediaStream([this._mediaStreamTrack]);
    const recorder = new MediaRecorderClass(stream, { mimeType: 'audio/wav' });
    recorder.ondataavailable = (event) => this._ondataavailable(event);
    this._mediaRecorder = recorder;
    recorder.start(this._config.interval);
  }

  @synchronized
  async stop(): Promise<void> {
    const recorder = this._mediaRecorder;
    if (!recorder || recorder.state !== 'recording') {
      return;
    }
    // Await the actual stop (final dataavailable + encoder flush) before releasing the recorder, so a
    // subsequent start() does not collide with an in-progress encoding.
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });
    this._mediaRecorder = undefined;
  }

  @synchronized
  private async _ondataavailable(event: IBlobEvent): Promise<void> {
    const blob = event.data;
    const uint8Array = new Uint8Array(await blob.arrayBuffer());

    // First chunk from the MediaRecorder has a header.
    const isHeader =
      uint8Array[0] === 0x52 && // R
      uint8Array[1] === 0x49 && // I
      uint8Array[2] === 0x46 && // F
      uint8Array[3] === 0x46; // F
    let wav: WaveFile;

    if (isHeader) {
      wav = new WaveFile(uint8Array);
      this._header = uint8Array.slice(0, 44);
    } else if (this._header) {
      wav = new WaveFile(new Uint8Array([...this._header, ...uint8Array]));
    } else {
      log.warn('MediaStreamRecorder: no header');
      return;
    }

    this._onChunk!({
      timestamp: Date.now(),
      data: wav.getSamples(),
    });
  }
}
