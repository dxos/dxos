//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SentenceBuffer, splitSentences } from './sentence-buffer';

const block = (text: string, started = 's') => ({ _tag: 'transcript' as const, started, text });

describe('splitSentences', () => {
  test('splits on terminal punctuation, keeps the remainder', ({ expect }) => {
    expect(splitSentences('Hello there. How are')).toEqual({ sentences: ['Hello there.'], rest: 'How are' });
  });

  test('treats an ellipsis as non-terminal', ({ expect }) => {
    expect(splitSentences('I was thinking... maybe later')).toEqual({
      sentences: [],
      rest: 'I was thinking... maybe later',
    });
  });

  test('handles multiple sentences', ({ expect }) => {
    expect(splitSentences('One. Two! Three?')).toEqual({ sentences: ['One.', 'Two!', 'Three?'], rest: '' });
  });
});

describe('SentenceBuffer', () => {
  test('merges mid-sentence fragments into a single sentence', ({ expect }) => {
    const buffer = new SentenceBuffer();
    // Mirrors the file-transcription story's fragmented Whisper output.
    expect(buffer.push(block("I've been living in London for about..."))).toEqual([]);
    expect(buffer.push(block('Years,'))).toEqual([]);
    const emitted = buffer.push(block('maybe a bit longer.'));
    expect(emitted.map((entry) => entry.text)).toEqual([
      "I've been living in London for about... Years, maybe a bit longer.",
    ]);
  });

  test('emits a completed sentence and buffers the next', ({ expect }) => {
    const buffer = new SentenceBuffer();
    const emitted = buffer.push(block('I moved to Camden originally. And now I'));
    expect(emitted.map((entry) => entry.text)).toEqual(['I moved to Camden originally.']);
    expect(buffer.flush().map((entry) => entry.text)).toEqual(['And now I']);
  });

  test('inherits the timestamp of the fragment that began the sentence', ({ expect }) => {
    const buffer = new SentenceBuffer();
    buffer.push(block('Hello', '00:00:00'));
    const [emitted] = buffer.push(block('world.', '00:00:03'));
    expect(emitted.started).toBe('00:00:00');
  });
});
