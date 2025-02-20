//
// Copyright 2025 DXOS.org
//

import { type IBlobEvent, type IMediaRecorder, MediaRecorder, register } from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';
import { WaveFile } from 'wavefile';

import { synchronized } from '@dxos/async';
import { trace } from '@dxos/tracing';

import { type AudioChunk, AudioRecorder } from './audio-recorder';

await register(await connect());

export type WavMediaRecorderConfig = {
  interval: number;
};

/**
 * Recorder that uses the MediaContext API and AudioNode API to record audio.
 */
@trace.resource()
export class MediaStreamRecorder extends AudioRecorder {
  private readonly _mediaStreamTrack: MediaStreamTrack;
  /**
   * Default MediaRecorder implementation do not support wav encoding.
   */
  private readonly _mediaRecorder: IMediaRecorder;
  private readonly _config: WavMediaRecorderConfig;

  constructor(
    onChunk: (chunk: AudioChunk) => void,
    mediaStreamTrack: MediaStreamTrack,
    config: WavMediaRecorderConfig,
  ) {
    super(onChunk);
    this._mediaStreamTrack = mediaStreamTrack;
    const stream = new MediaStream([mediaStreamTrack]);
    this._mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/wav' });
    this._config = config;
  }

  @synchronized
  private async _ondataavailable(event: IBlobEvent) {
    const blob = event.data;
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const wavFile = new WaveFile();
    wavFile.fromScratch(1, this._mediaStreamTrack.getSettings().sampleRate!, '16', uint8Array);

    this._onChunk({
      timestamp: event.timeStamp,
      data: wavFile.getSamples(),
    });
  }

  get sampleRate() {
    return this._mediaStreamTrack.getSettings().sampleRate!;
  }

  async start() {
    if (this._mediaRecorder.state === 'recording') {
      return;
    }
    this._mediaRecorder.start(this._config.interval);
    this._mediaRecorder.ondataavailable = (event) => this._ondataavailable(event);
  }

  async stop() {
    if (this._mediaRecorder.state !== 'recording') {
      return;
    }
    this._mediaRecorder.stop();
  }
}
