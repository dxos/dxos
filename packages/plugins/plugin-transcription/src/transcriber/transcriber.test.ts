//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type AudioChunk } from './audio-recorder';
import { alignWhisperSegments, type WhisperSegment } from './transcriber';

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
  test('returns empty when no chunks were transcribed', () => {
    const result = alignWhisperSegments(
      [segment({ text: 'x', end: 1, words: [{ word: 'x', start: 0, end: 1 }] })],
      [],
      0,
    );
    expect(result.transcripts).toEqual([]);
    expect(result.lastUsedTimestamp).toBeUndefined();
  });

  test('absolute-timestamps and deduplicates segments against lastUsedTimestamp', () => {
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
    expect(first.lastUsedTimestamp).toBe(T0 + 1_000);

    // Same segments, same chunk start: every word's absolute start is < lastUsedTimestamp -> filtered out.
    const second = alignWhisperSegments(segments, [chunk(0)], first.lastUsedTimestamp!);
    expect(second.transcripts).toEqual([]);
    expect(second.lastUsedTimestamp).toBeUndefined();
  });

  test('keeps later words when earlier words fall before lastUsedTimestamp', () => {
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
    expect(result.lastUsedTimestamp).toBe(T0 + 2_000);
  });

  test('drops segments that end before lastUsedTimestamp', () => {
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
