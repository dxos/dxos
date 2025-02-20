//
// Copyright 2025 DXOS.org
//
//
// Copyright 2025 DXOS.org
//

import { WaveFile } from 'wavefile';

import { DeferredTask, synchronized } from '@dxos/async';
import { Resource } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';

import { type AudioChunk } from './audio-recorder';
import { CALLS_URL } from '../types';
import { mergeFloat64Arrays } from '../utils';

type Word = {
  word: string;
  start: number;
  end: number;
};

type Segment = {
  text: string;
  start: number;
  end: number;
  no_speech_prob: number;
  words: Word[];
};

export type TranscribedText = {
  timestamp: number;
  text: string;
};

type WavConfig = {
  channels: number;
  sampleRate: number;
  bitDepthCode: string;
};

/**
 * Handles transcription of audio chunks.
 * If user is not speaking, the last `minChunksAmount` chunks are saved and transcribed.
 * If user is speaking, the chunks are added to the buffer until the user is done talking.
 */
export class Transcription extends Resource {
  private _audioChunks: AudioChunk[] = [];
  private _lastWordEndTimestamp = 0;

  private _recording = false;
  private readonly _transcribeTask = new DeferredTask(this._ctx, async () => this._transcribe());
  private _config: WavConfig = { channels: 1, sampleRate: 16000, bitDepthCode: '16' };
  private _onTranscription?: (params: TranscribedText) => Promise<void>;
  private readonly _prefixedChunksAmount: number;

  constructor({ prefixedChunksAmount }: { prefixedChunksAmount: number }) {
    super();
    this._prefixedChunksAmount = prefixedChunksAmount;
  }

  protected override async _close() {
    this._recording = false;
  }

  setWavConfig(config: Partial<WavConfig>) {
    this._config = { ...this._config, ...config };
  }

  setOnTranscription(onTranscription: (params: TranscribedText) => Promise<void>) {
    this._onTranscription = onTranscription;
  }

  startChunksRecording() {
    this._recording = true;
  }

  stopChunksRecording() {
    if (!this._recording) {
      return;
    }
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
    if (!this._recording && !this._transcribeTask.scheduled && this._audioChunks.length >= this._prefixedChunksAmount) {
      this._audioChunks = this._prefixedChunksAmount > 0 ? this._audioChunks.slice(-this._prefixedChunksAmount) : [];
    }
  }

  private async _transcribe() {
    const chunks = this._audioChunks;

    const audio = await this._mergeAudioChunks(chunks);
    const segments = await this._fetchTranscription(audio);
    const text = this._getText(
      segments.flatMap((segment) => segment.words),
      chunks,
    );
    if (text) {
      await this._onTranscription?.(text);
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _mergeAudioChunks(chunks: AudioChunk[]) {
    const file = new WaveFile();
    invariant(this._config.sampleRate, 'Sample rate is not set');

    file.fromScratch(
      this._config.channels,
      this._config.sampleRate,
      this._config.bitDepthCode,
      mergeFloat64Arrays(chunks.map(({ data }) => data)),
    );

    return file.toBase64();
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _fetchTranscription(audio: string) {
    if (audio.length === 0) {
      this._audioChunks = [];
      throw new Error('No audio to send for transcribing');
    }

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

  private _getText(words: Word[], originalChunks: AudioChunk[]) {
    invariant(Array.isArray(words), 'Invalid words');
    const wordsToUse = words.filter(
      (segment) => segment.start * 1000 + originalChunks.at(0)!.timestamp > this._lastWordEndTimestamp,
    );

    this._lastWordEndTimestamp = (wordsToUse.at(-1)?.end ?? 0) * 1000 + originalChunks.at(0)!.timestamp;
    const textToUse = wordsToUse?.map((segment) => segment.word).join(' ');
    if (textToUse.length === 0) {
      return;
    }

    return { timestamp: originalChunks.at(0)!.timestamp, text: textToUse };
  }
}
