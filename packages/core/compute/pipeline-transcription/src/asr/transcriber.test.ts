//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { type ContentBlock } from '@dxos/types';

import { type AudioChunk, type AudioRecorder } from './audio-recorder';
import { type TranscribeFn, Transcriber, type WhisperSegment, alignWhisperSegments } from './transcriber';

const T0 = Date.parse('2026-01-01T00:00:00.000Z');

const chunk = (offsetMs = 0, samples = 16): AudioChunk => ({
  timestamp: T0 + offsetMs,
  data: new Float64Array(samples),
});

const segment = (overrides: Partial<WhisperSegment>): WhisperSegment => ({
  text: '',
  start: 0,
  end: 0,
  no_speech_prob: 0,
  words: [],
  ...overrides,
});

describe('alignWhisperSegments', () => {
  test('returns empty when no chunks were transcribed', ({ expect }) => {
    const result = alignWhisperSegments(
      [segment({ text: 'x', end: 1, words: [{ word: 'x', start: 0, end: 1 }] })],
      [],
      0,
    );
    expect(result.transcripts).toEqual([]);
    expect(result.lastTimestamp).toBeUndefined();
  });

  test('absolute-timestamps and deduplicates segments against lastTimestamp', ({ expect }) => {
    const segments: WhisperSegment[] = [
      segment({
        text: 'hello world',
        start: 0,
        end: 1,
        words: [
          { word: 'hello ', start: 0, end: 0.5 },
          { word: 'world', start: 0.5, end: 1 },
        ],
      }),
    ];

    const first = alignWhisperSegments(segments, [chunk(0)], 0);
    expect(first.transcripts).toHaveLength(1);
    expect(first.transcripts[0]._tag).toBe('transcript');
    expect(first.transcripts[0].text).toBe('hello world');
    expect(new Date(first.transcripts[0].started).getTime()).toBe(T0);
    expect(first.lastTimestamp).toBe(T0 + 1_000);

    // Same segments, same chunk start: every word's absolute start is < lastTimestamp -> filtered out.
    const second = alignWhisperSegments(segments, [chunk(0)], first.lastTimestamp!);
    expect(second.transcripts).toEqual([]);
    expect(second.lastTimestamp).toBeUndefined();
  });

  test('keeps later words when earlier words fall before lastTimestamp', ({ expect }) => {
    const segments: WhisperSegment[] = [
      segment({
        text: 'old new',
        start: 0,
        end: 2,
        words: [
          { word: 'old ', start: 0, end: 1 },
          { word: 'new', start: 1.5, end: 2 },
        ],
      }),
    ];

    // First word starts at T0, second at T0+1500 — only the second survives a cursor at T0+1000.
    const result = alignWhisperSegments(segments, [chunk(0)], T0 + 1_000);
    expect(result.transcripts).toHaveLength(1);
    expect(result.transcripts[0].text).toBe('new');
    expect(new Date(result.transcripts[0].started).getTime()).toBe(T0 + 1_500);
    expect(result.lastTimestamp).toBe(T0 + 2_000);
  });

  test('drops segments that end before lastTimestamp', ({ expect }) => {
    const segments: WhisperSegment[] = [
      segment({
        text: 'stale',
        start: 0,
        end: 0.5,
        words: [{ word: 'stale', start: 0, end: 0.5 }],
      }),
      segment({
        text: 'fresh',
        start: 1,
        end: 2,
        words: [{ word: 'fresh', start: 1.5, end: 2 }],
      }),
    ];

    const result = alignWhisperSegments(segments, [chunk(0)], T0 + 1_000);
    expect(result.transcripts).toHaveLength(1);
    expect(result.transcripts[0].text).toBe('fresh');
  });
});

describe('Transcriber', () => {
  test('delivers transcribed segments on flush', async ({ expect }) => {
    const transcribe: TranscribeFn = async () => [
      segment({ text: 'hello', start: 0, end: 1, words: [{ word: 'hello', start: 0, end: 1 }] }),
    ];
    const { recorder, transcriber, delivered } = setup(transcribe);
    await transcriber.open();
    transcriber.startChunksRecording();
    recorder.emitChunk(chunk(0));

    await transcriber.flush();
    expect(delivered).toHaveLength(1);
    expect(delivered[0][0].text).toBe('hello');
    await transcriber.close();
  });

  test('abort() cancels the in-flight request and drops the batch', async ({ expect }) => {
    const requestStarted = new Trigger();
    let capturedSignal: AbortSignal | undefined;
    const transcribe: TranscribeFn = (_audio, options) => {
      capturedSignal = options?.signal;
      requestStarted.wake();
      // Models a fetch-like transport: rejects when the signal fires.
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('cancelled')));
      });
    };
    const { recorder, transcriber, delivered } = setup(transcribe);
    await transcriber.open();
    transcriber.startChunksRecording();
    recorder.emitChunk(chunk(0));

    const flushed = transcriber.flush();
    await requestStarted.wait();
    transcriber.abort();
    await flushed;
    expect(capturedSignal?.aborted).toBe(true);
    expect(delivered).toHaveLength(0);
    await transcriber.close();
  });

  test('segments resolving after close() are not delivered', async ({ expect }) => {
    const requestStarted = new Trigger();
    let resolveRequest: ((segments: WhisperSegment[]) => void) | undefined;
    const transcribe: TranscribeFn = () => {
      requestStarted.wake();
      // Ignores the abort signal — models a response already in flight when close() runs.
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    };
    const { recorder, transcriber, delivered } = setup(transcribe);
    await transcriber.open();
    transcriber.startChunksRecording();
    recorder.emitChunk(chunk(0));

    const flushed = transcriber.flush();
    await requestStarted.wait();
    await transcriber.close();
    resolveRequest?.([segment({ text: 'late', start: 0, end: 1, words: [{ word: 'late', start: 0, end: 1 }] })]);
    await flushed;
    expect(delivered).toHaveLength(0);
  });
});

const stubRecorder = (): AudioRecorder & { emitChunk: (chunk: AudioChunk) => void } => {
  let onChunk: ((chunk: AudioChunk) => void) | undefined;
  return {
    wavConfig: { channels: 1, sampleRate: 16_000, bitDepthCode: '16' },
    setOnChunk: (callback) => {
      onChunk = callback;
    },
    start: async () => {},
    stop: async () => {},
    emitChunk: (audioChunk) => onChunk?.(audioChunk),
  };
};

const setup = (transcribe: TranscribeFn) => {
  const recorder = stubRecorder();
  const delivered: ContentBlock.Transcript[][] = [];
  const transcriber = new Transcriber({
    config: { transcribeAfterChunksAmount: 100, prefixBufferChunksAmount: 10 },
    recorder,
    transcribe,
    onSegments: async (segments) => {
      delivered.push(segments);
    },
  });
  return { recorder, transcriber, delivered };
};
