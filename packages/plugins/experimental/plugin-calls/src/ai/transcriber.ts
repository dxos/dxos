//
// Copyright 2025 DXOS.org
//
//
// Copyright 2025 DXOS.org
//

import { WaveFile } from 'wavefile';

import { DeferredTask, Trigger } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';

import { type AudioRecorder, type AudioChunk } from './audio-recorder';
import { CALLS_URL, type TranscriptSegment } from '../types';
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

export type TranscribeConfig = {
  /**
   * Number of chunks to transcribe automatically after.
   */
  transcribeAfterChunksAmount: number;

  /**
   * Number of chunks to save before the user starts speaking.
   * This is needed to catch the beginning of the user's speech.
   */
  prefixBufferChunksAmount: number;
};

/**
 * Handles transcription of audio chunks.
 * If user is not speaking, the last `minChunksAmount` chunks are saved and transcribed.
 * If user is speaking, the chunks are added to the buffer until the user is done talking.
 */
export class Transcriber extends Resource {
  private _audioChunks: AudioChunk[] = [];
  private _lastUsedTimestamp = 0;

  private readonly _recorder: AudioRecorder;
  private readonly _onSegments: (segments: TranscriptSegment[]) => Promise<void>;
  private _recording = false;
  private _transcribeTask?: DeferredTask = undefined;
  private readonly _config: TranscribeConfig;

  private readonly _openTrigger = new Trigger({ autoReset: true });

  constructor({
    recorder,
    onSegments,
    config,
  }: {
    recorder: AudioRecorder;
    onSegments: (segments: TranscriptSegment[]) => Promise<void>;
    config: TranscribeConfig;
  }) {
    super();
    this._recorder = recorder;
    this._onSegments = onSegments;
    this._config = config;
  }

  protected override async _open(ctx: Context) {
    this._recorder.setOnChunk((chunk) => this._saveAudioChunk(chunk));
    await this._recorder.start();
    this._transcribeTask = new DeferredTask(ctx, async () => this._transcribe());
    this._openTrigger.wake();
  }

  protected override async _close() {
    this._recording = false;
    this._transcribeTask = undefined;
    await this._recorder.stop();
  }

  startChunksRecording() {
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return;
    }
    this._recording = true;
  }

  stopChunksRecording() {
    if (this._lifecycleState !== LifecycleState.OPEN || !this._recording) {
      return;
    }
    this._recording = false;
    this._transcribeTask?.schedule();
  }

  private _saveAudioChunk(chunk: AudioChunk) {
    this._audioChunks.push(chunk);

    // Clean the buffer if the user is not speaking and the transcription task is not scheduled.
    if (
      !this._recording &&
      (!this._transcribeTask || !this._transcribeTask.scheduled) &&
      this._audioChunks.length >= this._config.prefixBufferChunksAmount
    ) {
      this._audioChunks = this._dropOldChunks();
    } else if (this._audioChunks.length >= this._config.transcribeAfterChunksAmount && this._recording) {
      this._transcribeTask?.schedule();
    }
  }

  private async _transcribe() {
    const chunks = this._audioChunks;
    this._audioChunks = this._dropOldChunks();
    if (chunks.length === 0) {
      return;
    }

    const audio = await this._mergeAudioChunks(chunks);
    const segments = await this._fetchTranscription(audio);
    if (!Array.isArray(segments) || segments.length === 0) {
      return;
    }

    const alignedSegments = this._alignSegments(segments, chunks);
    if (alignedSegments.length > 0) {
      await this._onSegments(alignedSegments);
    }
  }

  private _dropOldChunks() {
    return this._config.prefixBufferChunksAmount > 0
      ? this._audioChunks.slice(-this._config.prefixBufferChunksAmount)
      : [];
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _mergeAudioChunks(chunks: AudioChunk[]) {
    const file = new WaveFile();
    const wavConfig = this._recorder.wavConfig;

    file.fromScratch(
      wavConfig.channels,
      wavConfig.sampleRate,
      wavConfig.bitDepthCode,
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

    log.info('transcription response', {
      segments,
      string: segments.map((segments) => segments.text).join(' '),
    });

    return segments;
  }

  private _alignSegments(segments: WhisperSegment[], originalChunks: AudioChunk[]): TranscriptSegment[] {
    // Absolute zero for all relative timestamps in the segments.
    const zeroTimestamp = originalChunks.at(0)!.timestamp;

    const filteredSegments = segments
      // Use segments that end after the last used timestamp.
      // Segments could overlap, so we need to filter words that starts after the last used timestamp.
      .filter((segment) => zeroTimestamp + segment.end * 1_000 >= this._lastUsedTimestamp)
      // Use words that starts after the last used timestamp.
      .map((segment) => {
        const words = segment.words.filter((word) => zeroTimestamp + word.start * 1_000 >= this._lastUsedTimestamp);
        return {
          ...segment,
          words,
          text: words.map((word) => word.word).join(''),
          start: words.at(0)?.start ?? segment.end,
        };
      })
      .filter((segment) => segment.words.length > 0);

    if (filteredSegments.length === 0) {
      return [];
    }

    // Update last timestamp.
    this._lastUsedTimestamp = zeroTimestamp + filteredSegments.at(-1)!.end * 1_000;

    // Add absolute timestamp to each segment.
    return filteredSegments.map((segment) => ({
      started: new Date(zeroTimestamp + segment.start * 1_000),
      text: segment.text,
    }));
  }
}
