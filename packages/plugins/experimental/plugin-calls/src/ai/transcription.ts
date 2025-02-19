//
// Copyright 2025 DXOS.org
//
//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { WaveFile } from 'wavefile';

import { DeferredTask, synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type AudioChunk } from './recorder';
import { CALLS_URL } from '../types';
import { mergeFloat64Arrays } from '../utils';

type Segment = {
  text: string;
  start: number;
  end: number;
  no_speech_prob: number;
};

/**
 * Handles transcription of audio chunks.
 * If user is not speaking, the last `minChunksAmount` chunks are saved and transcribed.
 * If user is speaking, the chunks are added to the buffer until the user is done talking.
 */
export class Transcription extends Resource {
  private _audioChunks: AudioChunk[] = [];
  private _lastSegEndTimestamp = 0;

  private _recording = false;
  private readonly _transcribeTask = new DeferredTask(this._ctx, async () => this._transcribe());

  constructor(
    private readonly _onTranscription: ({ timestamp, text }: { timestamp: number; text: string }) => Promise<void>,
    private readonly _config: {
      /**
       * Number of chunks to buffer before transcribing.
       */
      prefixedChunksAmount: number;

      /**
       * The sample rate of the audio chunks.
       */
      sampleRate: number;
    },
  ) {
    super();
  }

  protected override async _close() {
    this._recording = false;
  }

  setSampleRate(sampleRate: number) {
    this._config.sampleRate = sampleRate;
  }

  startChunksRecording() {
    this._recording = true;
  }

  stopChunksRecording() {
    this._recording = false;
    this._transcribeTask.schedule();
  }

  @synchronized
  onChunk(chunk: AudioChunk) {
    this._saveAudioChunk(chunk);
  }

  private _saveAudioChunk(chunk: AudioChunk) {
    this._audioChunks.push(chunk);

    // Clean the buffer if the user is not speaking and the transcription task is not scheduled.
    if (
      !this._recording &&
      !this._transcribeTask.scheduled &&
      this._audioChunks.length >= this._config.prefixedChunksAmount
    ) {
      this._audioChunks =
        this._config.prefixedChunksAmount > 0 ? this._audioChunks.slice(-this._config.prefixedChunksAmount) : [];
    }
  }

  private async _transcribe() {
    const chunks = this._audioChunks;

    const audio = this._mergeAudioChunks(chunks);
    const segments = await this._fetchTranscription(audio);
    const text = this._getText(segments, chunks);
    if (text) {
      await this._onTranscription(text);
    }
  }

  private _mergeAudioChunks(chunks: AudioChunk[]) {
    const file = new WaveFile();

    file.fromScratch(1, this._config.sampleRate, '16', mergeFloat64Arrays(chunks.map(({ data }) => data)));

    fs.writeFileSync(path.join(__dirname, 'audio.wav'), file.toBuffer());

    return file.toBase64();
  }

  private async _fetchTranscription(audio: string) {
    if (audio.length === 0) {
      this._audioChunks = [];
      throw new Error('No audio to send for transcribing');
    }

    log.verbose('Sending chunks to transcribe', { audio });
    const response = await fetch(`${CALLS_URL}/transcribe`, {
      method: 'POST',
      body: JSON.stringify({ audio }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      this._audioChunks = [];
      throw new Error('Failed to transcribe');
    }

    const {
      segments,
    }: {
      segments: Segment[];
    } = await response.json();

    log.info('Transcription response', {
      segments,
      string: segments.map((segments) => segments.text).join(' '),
    });

    return segments;
  }

  private _getText(segments: Segment[], originalChunks: AudioChunk[]) {
    invariant(Array.isArray(segments), 'Invalid segments');

    log.info('Updating document', {
      segments,
      originalStart: originalChunks.at(0)!.timestamp,
      lastSegEndTimestamp: this._lastSegEndTimestamp,
    });
    const segsToUse = segments.filter(
      (segment) => segment.start * 1000 + originalChunks.at(0)!.timestamp > this._lastSegEndTimestamp,
    );

    this._lastSegEndTimestamp = (segsToUse.at(-1)?.end ?? 0) * 1000 + originalChunks.at(0)!.timestamp;
    const textToUse = segsToUse?.map((segment) => segment.text).join(' ') + '';
    if (textToUse.length === 0) {
      return;
    }

    return { timestamp: originalChunks.at(0)!.timestamp, text: textToUse };
  }
}
