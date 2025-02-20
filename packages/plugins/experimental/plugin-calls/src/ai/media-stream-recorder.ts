//
// Copyright 2025 DXOS.org
//

import { type IBlobEvent, type IMediaRecorder, MediaRecorder, register } from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';
import { WaveFile } from 'wavefile';

import { synchronized } from '@dxos/async';
import { trace } from '@dxos/tracing';

import { type AudioChunk, AudioRecorder } from './audio-recorder';

/**
 * Initialize the media recorder by registering the WAV encoder.
 */
export const initializeMediaRecorder = async () => {
  await register(await connect());
};

export type WavMediaRecorderConfig = {};

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
  private readonly _interval: number;
  private _header?: Uint8Array;

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
    const stream = new MediaStream([mediaStreamTrack]);
    this._mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/wav' });
    this._interval = interval;
  }

  @synchronized
  private async _ondataavailable(event: IBlobEvent) {
    const blob = event.data;
    const uint8Array = new Uint8Array(await blob.arrayBuffer());
    const isHeader =
      uint8Array[0] === 0x52 && // R
      uint8Array[1] === 0x49 && // I
      uint8Array[2] === 0x46 && // F
      uint8Array[3] === 0x46; // F
    let wav: WaveFile;
    if (isHeader) {
      wav = new WaveFile(uint8Array);
      this._header = uint8Array.slice(0, 44);
      await saveFile(wav.toBuffer());
    } else {
      wav = new WaveFile(new Uint8Array([...this._header!, ...uint8Array]));
    }

    this._onChunk({
      timestamp: event.timeStamp,
      data: wav.getSamples(),
    });
  }

  async start() {
    if (this._mediaRecorder.state === 'recording') {
      return;
    }
    this._mediaRecorder.ondataavailable = (event) => this._ondataavailable(event);
    this._mediaRecorder.start(this._interval);
  }

  async stop() {
    if (this._mediaRecorder.state !== 'recording') {
      return;
    }
    this._mediaRecorder.stop();
  }
}

const saveFile = async (blob: Uint8Array) => {
  const a = document.createElement('a');
  a.download = 'my-file.wav';
  a.href = URL.createObjectURL(new Blob([blob], { type: 'audio/wav' }));
  a.addEventListener('click', (e) => {
    setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1000);
  });
  a.click();
};
