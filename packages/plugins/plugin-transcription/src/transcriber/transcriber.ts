//
// Copyright 2025 DXOS.org
//

import { WaveFile } from 'wavefile';

import { DeferredTask, Trigger } from '@dxos/async';
import { type Context, LifecycleState, Resource } from '@dxos/context';
import { log } from '@dxos/log';
import { trace } from '@dxos/tracing';
import { type ContentBlock } from '@dxos/types';

import { TRANSCRIPTION_URL } from '../types';
import { mergeFloat64Arrays } from '../util';

import { type AudioChunk, type AudioRecorder } from './audio-recorder';

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

export type TranscriberProps = {
  config: TranscribeConfig;
  recorder: AudioRecorder;
  /**
   * Callback to handle the transcribed segments, after all segment transformers are applied.
   * @param segments - The transcribed segments.
   */
  onSegments: (segments: ContentBlock.Transcript[]) => Promise<void>;
};

/**
 * Handles transcription of audio chunks.
 * If user is not speaking, the last `minChunksAmount` chunks are saved and transcribed.
 * If user is speaking, the chunks are added to the buffer until the user is done talking.
 */
export class Transcriber extends Resource {
  private _audioChunks: AudioChunk[] = [];
  private _lastUsedTimestamp = 0;

  private readonly _openTrigger = new Trigger({ autoReset: true });

  private readonly _config: TranscribeConfig;
  private readonly _recorder: AudioRecorder;
  private readonly _onSegments: TranscriberProps['onSegments'];

  private _recording = false;
  private _transcribeTask?: DeferredTask = undefined;

  constructor({ config, recorder, onSegments }: TranscriberProps) {
    super();
    this._config = config;
    this._recorder = recorder;
    this._onSegments = onSegments;
  }

  protected override async _open(ctx: Context): Promise<void> {
    log.info('opening');
    this._recorder.setOnChunk((chunk) => this._saveAudioChunk(chunk));
    await this._recorder.start();
    this._transcribeTask = new DeferredTask(ctx, async () => this._transcribe());
    this._openTrigger.wake();
  }

  protected override async _close(): Promise<void> {
    log.info('closing');
    this._recording = false;
    this._transcribeTask = undefined;
    await this._recorder.stop();
  }

  startChunksRecording(): void {
    log.info('starting');
    if (this._lifecycleState !== LifecycleState.OPEN) {
      return;
    }

    this._recording = true;
  }

  stopChunksRecording(): void {
    if (this._lifecycleState !== LifecycleState.OPEN || !this._recording) {
      return;
    }

    this._recording = false;
    this._transcribeTask?.schedule();
    log.info('stopped');
  }

  private _saveAudioChunk(chunk: AudioChunk): void {
    log('saving audio chunk', { chunk });
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

  private async _transcribe(): Promise<void> {
    log('transcribing', { chunks: this._audioChunks.length });
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

  private _dropOldChunks(): AudioChunk[] {
    return this._config.prefixBufferChunksAmount > 0
      ? this._audioChunks.slice(-this._config.prefixBufferChunksAmount)
      : [];
  }

  @trace.span({ showInBrowserTimeline: true })
  private async _mergeAudioChunks(chunks: AudioChunk[]): Promise<string> {
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
  private async _fetchTranscription(audio: string): Promise<WhisperSegment[]> {
    if (audio.length === 0) {
      this._audioChunks = [];
      throw new Error('No audio to send for transcribing');
    }

    const response = await fetch(`${TRANSCRIPTION_URL}/transcribe`, {
      method: 'POST',
      body: JSON.stringify({ audio }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      this._audioChunks = [];
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const { segments } = (await response.json()) as {
      segments: WhisperSegment[];
    };

    log.info('transcription response', {
      segments: segments.length,
      string: segments.map((segments) => segments.text).join(' '),
    });

    return segments;
  }

  private _alignSegments(segments: WhisperSegment[], originalChunks: AudioChunk[]): ContentBlock.Transcript[] {
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
      _tag: 'transcript',
      started: new Date(zeroTimestamp + segment.start * 1_000).toISOString(),
      text: segment.text.trim(),
    }));
  }
}
