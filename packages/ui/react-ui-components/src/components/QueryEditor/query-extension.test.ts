//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { describe, expect, test } from 'vitest';

import { Tag } from '@dxos/echo';

import { buildQueryDecorations, query } from './query-extension';

const tags: Tag.Map = { tag_1: Tag.make({ label: 'important' }) };

/** The state the extension decorates, with the caret at `head` (end of document by default). */
const stateOf = (doc: string, head = doc.length) =>
  EditorState.create({ doc, selection: EditorSelection.cursor(head), extensions: [query({ tags })] });

const decorationsOf = (doc: string, head?: number) => {
  const set = buildQueryDecorations(stateOf(doc, head), { tags });
  const ranges: { from: number; to: number; atomic: boolean }[] = [];
  const cursor = set.iter();
  while (cursor.value) {
    ranges.push({ from: cursor.from, to: cursor.to, atomic: !!cursor.value.spec.atomic });
    cursor.next();
  }

  return ranges;
};

/**
 * Decorations are fed to a `RangeSetBuilder`, which throws on an out-of-order range. The bare-`#`
 * ranges come from a document scan rather than the syntax tree, so they interleave with the tree's
 * own and have to be sorted before being added — this is the guard for that.
 */
describe('buildQueryDecorations', () => {
  test.each([
    ['', 'empty'],
    ['#', 'a bare hash'],
    ['#imp', 'a partial tag'],
    ['#important ', 'a terminated tag'],
    ['#a #b #c', 'several tags'],
    ['type:org.dxos.Person AND #important', 'a tag following another filter'],
    ['{ name: "x" } #tag', 'an object literal before a tag'],
    ['"# not a tag" #real', 'a hash inside a string'],
  ])('builds over %j (%s)', (doc) => {
    expect(() => decorationsOf(doc)).not.toThrow();
  });
});

/**
 * An atomic range cannot be edited character-by-character, so it may only cover a tag the user has
 * FINISHED. Applying it while the label is still being typed swallows the next keystroke — which is
 * what the previous unconditional `atomic: true` did.
 */
describe('tag atomicity', () => {
  const atomic = (doc: string, head?: number) => decorationsOf(doc, head).filter((range) => range.atomic);

  test('an unterminated tag is decorated but not atomic', () => {
    // Still being typed: no trailing space yet, so the label must stay editable.
    const ranges = decorationsOf('#import');
    expect(ranges).not.toHaveLength(0);
    expect(atomic('#import')).toHaveLength(0);
  });

  test('a bare hash is decorated as soon as it is typed, and is never atomic', () => {
    const ranges = decorationsOf('#');
    expect(ranges.some((range) => range.from === 0 && range.to === 1)).toBe(true);
    expect(atomic('#')).toHaveLength(0);
  });

  test('a tag terminated by a space becomes atomic', () => {
    expect(atomic('#important ')).toHaveLength(1);
  });

  test('a tag terminated by a following term is atomic', () => {
    // Termination is whitespace, not end-of-input: the first tag here is finished, the second is not.
    const ranges = atomic('#important #part');
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toMatchObject({ from: 0, to: 10 });
  });

  test('a hash inside a string is not treated as a tag', () => {
    const ranges = decorationsOf('"# not a tag"');
    expect(ranges.filter((range) => range.from === 1)).toHaveLength(0);
  });
});
