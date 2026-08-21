//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { alignSegments } from './align-segments';
import { sourceHash } from './hash';
import { type RawSegment, segmentAt } from './Segmentation';

const slice = (text: string, range: { start: number; end: number }) => text.slice(range.start, range.end);

describe('alignSegments', () => {
  test('assigns exact ranges and nests children under their parent', ({ expect }) => {
    const source = 'The dog barks. The cat sleeps.';
    const raw: RawSegment[] = [
      {
        kind: 'sentence',
        text: 'The dog barks.',
        children: [{ kind: 'vocab', text: 'barks' }],
      },
      {
        kind: 'sentence',
        text: 'The cat sleeps.',
        children: [{ kind: 'vocab', text: 'sleeps' }],
      },
    ];

    const { segments, sourceHash: hash } = alignSegments(source, raw);
    expect(segments.map((segment) => slice(source, segment.source))).toEqual([
      'The dog barks.',
      'barks',
      'The cat sleeps.',
      'sleeps',
    ]);
    expect(segments[1].parent).toBe(segments[0].id);
    expect(segments[3].parent).toBe(segments[2].id);
    expect(hash).toBe(sourceHash(source));
  });

  test('locates a child inside its own parent, not at the first match in the document', ({ expect }) => {
    // "the cat" occurs in both sentences; the child of the second must resolve to the second.
    const source = 'I saw the cat. You saw the cat.';
    const { segments } = alignSegments(source, [
      { kind: 'sentence', text: 'I saw the cat.' },
      { kind: 'sentence', text: 'You saw the cat.', children: [{ kind: 'vocab', text: 'the cat' }] },
    ]);

    const vocab = segments.find((segment) => segment.kind === 'vocab')!;
    expect(vocab.source.start).toBeGreaterThan(source.indexOf('You'));
    expect(slice(source, vocab.source)).toBe('the cat');
  });

  test('drops a segment whose text is not in the source, along with its children', ({ expect }) => {
    const source = 'The dog barks.';
    const { segments } = alignSegments(source, [
      { kind: 'sentence', text: 'A sentence that was never written.', children: [{ kind: 'vocab', text: 'dog' }] },
      { kind: 'sentence', text: 'The dog barks.' },
    ]);

    expect(segments).toHaveLength(1);
    expect(slice(source, segments[0].source)).toBe('The dog barks.');
  });

  test('pairs source and translation ranges', ({ expect }) => {
    const source = '毎朝、パン屋は店を開けます。';
    const target = 'Every morning the bakery opens its shop.';
    const { segments, targetHash } = alignSegments(
      source,
      [
        {
          kind: 'sentence',
          text: '毎朝、パン屋は店を開けます。',
          translation: 'Every morning the bakery opens its shop.',
          children: [{ kind: 'vocab', text: 'パン屋', translation: 'bakery', gloss: 'bakery' }],
        },
      ],
      target,
    );

    const [sentence, vocab] = segments;
    expect(slice(target, sentence.target!)).toBe('Every morning the bakery opens its shop.');
    expect(slice(target, vocab.target!)).toBe('bakery');
    expect(vocab.gloss).toBe('bakery');
    expect(targetHash).toBe(sourceHash(target));
  });

  test('degrades to a source-only segment when the counterpart cannot be quoted', ({ expect }) => {
    const source = 'The dog barks.';
    const { segments } = alignSegments(
      source,
      [{ kind: 'sentence', text: 'The dog barks.', translation: 'not present in the target' }],
      'Der Hund bellt.',
    );

    expect(segments).toHaveLength(1);
    expect(segments[0].target).toBeUndefined();
  });
});

describe('segmentAt', () => {
  const source = 'The dog barks loudly.';
  const { segments } = alignSegments(source, [
    {
      kind: 'paragraph',
      text: 'The dog barks loudly.',
      children: [
        {
          kind: 'sentence',
          text: 'The dog barks loudly.',
          children: [
            { kind: 'clause', text: 'barks loudly' },
            { kind: 'vocab', text: 'loudly' },
          ],
        },
      ],
    },
  ]);

  test('returns the most specific segment covering the position', ({ expect }) => {
    expect(segmentAt(segments, source.indexOf('loudly'))?.kind).toBe('vocab');
    expect(segmentAt(segments, source.indexOf('barks'))?.kind).toBe('clause');
    expect(segmentAt(segments, source.indexOf('dog'))?.kind).toBe('sentence');
  });

  test('breaks a tie on equal extents by preferring the finer kind', ({ expect }) => {
    // Paragraph and sentence cover exactly the same characters here.
    expect(segmentAt(segments, 0)?.kind).toBe('sentence');
  });

  test('is end-exclusive, so adjacent segments never both match', ({ expect }) => {
    const end = source.indexOf('loudly') + 'loudly'.length;
    expect(segmentAt(segments, end)?.kind).not.toBe('vocab');
  });
});
