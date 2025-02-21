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
import { CALLS_URL, type Segment } from '../types';
import { mergeFloat64Arrays } from '../utils';

type WhisperWord = {
  word: string;
  /**
   * Time in seconds from the start of the audio.
   */
  start: number;
  /**
   * Time in seconds from the start of the audio.
   */
  end: number;
};

type WhisperSegment = {
  text: string;
  /**
   * Time in seconds from the start of the audio.
   */
  start: number;
  /**
   * Time in seconds from the start of the audio.
   */
  end: number;
  /**
   * Probability of no speech in the segment.
   */
  no_speech_prob: number;
  words: WhisperWord[];
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
  private _lastUsedTimestamp = 0;

  private _recording = false;
  private readonly _transcribeTask = new DeferredTask(this._ctx, async () => this._transcribe());
  private _config: WavConfig = { channels: 1, sampleRate: 16000, bitDepthCode: '16' };
  private _onTranscription?: (params: Segment[]) => Promise<void>;
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

  setOnTranscription(onTranscription: (params: Segment[]) => Promise<void>) {
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
    if (!Array.isArray(segments) || segments.length === 0) {
      return;
    }

    const alignedSegments = this._alignSegments(segments, chunks);
    if (alignedSegments.length > 0) {
      await this._onTranscription?.(alignedSegments);
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
      segments: WhisperSegment[];
    } = await response.json();

    log.info('Transcription response', {
      segments,
      string: segments.map((segments) => segments.text).join(' '),
    });

    return segments;
  }

  private _alignSegments(segments: WhisperSegment[], originalChunks: AudioChunk[]): Segment[] {
    // Absolute zero for all relative timestamps in the segments.
    const zeroTimestamp = originalChunks.at(0)!.timestamp;

    // Drop segments that end before the last segment end timestamp.
    const filteredSegments = segments.filter((segment) => zeroTimestamp + segment.end * 1000 > this._lastUsedTimestamp);

    // Filter words of first segment to use.
    const firstSegment = {
      ...filteredSegments.at(0)!,
      words: filteredSegments
        .at(0)!
        .words.filter((word) => zeroTimestamp + word.start * 1000 > this._lastUsedTimestamp),
    };

    // Update last timestamp.
    this._lastUsedTimestamp = filteredSegments.at(-1)?.end ?? this._lastUsedTimestamp;

    // Add absolute timestamp to each segment.
    return [firstSegment, ...filteredSegments.slice(1)].map((segment) => ({
      text: segment.text,
      timestamp: new Date(zeroTimestamp + segment.start * 1000),
    }));
  }
}
