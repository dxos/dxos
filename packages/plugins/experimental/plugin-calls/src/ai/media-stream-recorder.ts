//
// Copyright 2025 DXOS.org
//

import { type IBlobEvent, type IMediaRecorder, MediaRecorder, register } from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';
import { WaveFile } from 'wavefile';

import { synchronized } from '@dxos/async';
import { trace } from '@dxos/tracing';

import { type AudioChunk, AudioRecorder } from './audio-recorder';

let wavEncoderInitialized = false;

export type WavMediaRecorderConfig = {};

/**
 * Recorder that uses the MediaContext API and AudioNode API to record audio.
 *
 * It records MediaStream using https://www.npmjs.com/package/extendable-media-recorder.
 */
@trace.resource()
export class MediaStreamRecorder extends AudioRecorder {
  private readonly _mediaStreamTrack: MediaStreamTrack;
  /**
   * Default MediaRecorder implementation do not support wav encoding.
   */
  private readonly _interval: number;
  private _mediaRecorder?: IMediaRecorder = undefined;
  private _header?: Uint8Array = undefined;

  constructor({
    onChunk,
    mediaStreamTrack,
    interval,
  }: {
    onChunk: (chunk: AudioChunk) => void;
    mediaStreamTrack: MediaStreamTrack;
    interval: number;
  }) {
    super(onChunk);
    this._mediaStreamTrack = mediaStreamTrack;
    this._interval = interval;
  }

  @synchronized
  private async _ondataavailable(event: IBlobEvent) {
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
    } else {
      wav = new WaveFile(new Uint8Array([...this._header!, ...uint8Array]));
    }

    this._onChunk({
      timestamp: Date.now(),
      data: wav.getSamples(),
    });
  }

  async start() {
    if (!wavEncoderInitialized) {
      await register(await connect());
      wavEncoderInitialized = true;
    }

    if (!this._mediaRecorder) {
      const stream = new MediaStream([this._mediaStreamTrack]);
      this._mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/wav' });
    }

    if (this._mediaRecorder.state === 'recording') {
      return;
    }
    this._mediaRecorder.ondataavailable = (event) => this._ondataavailable(event);
    this._mediaRecorder.start(this._interval);
  }

  async stop() {
    if (this._mediaRecorder?.state !== 'recording') {
      return;
    }
    this._mediaRecorder.stop();
  }
}
