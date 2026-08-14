//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, test } from 'vitest';

import { Tag } from '@dxos/echo';

import { buildQueryDecorations, query, queryDoc, queryText } from './query-extension';

const tags: Tag.Map = { tag_1: Tag.make({ label: 'important' }) };

/** A mounted view, which is what applies the transaction filter. */
const viewOf = (doc: string) => {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  return new EditorView({ state: EditorState.create({ doc, extensions: [query({ tags })] }), parent });
};

/** Types `text` one character at a time, as a user would. */
const type = (view: EditorView, text: string) => {
  for (const char of text) {
    const { head } = view.state.selection.main;
    view.dispatch({ changes: { from: head, insert: char }, selection: EditorSelection.cursor(head + 1) });
  }
};

const decorationsOf = (doc: string, head?: number) => {
  const state = EditorState.create({
    doc,
    selection: EditorSelection.cursor(head ?? doc.length),
    extensions: [query({ tags })],
  });
  const ranges: { from: number; to: number; atomic: boolean }[] = [];
  const cursor = buildQueryDecorations(state, { tags }).iter();
  while (cursor.value) {
    ranges.push({ from: cursor.from, to: cursor.to, atomic: !!cursor.value.spec.atomic });
    cursor.next();
  }

  return ranges;
};

/**
 * The document always ends in a space. That is what gives a tag ONE rendered form: a tag is a chip
 * once whitespace terminates it, and without a guaranteed terminator the last tag in the query never
 * qualified, so it had to be drawn a second way over live text.
 */
describe('trailing space', () => {
  test('is present from mount, since the filter cannot see the initial state', () => {
    // A seeded value (the mailbox's `#inbox`) would otherwise render as raw text until first edited.
    expect(queryDoc('#inbox')).toBe('#inbox ');
    expect(queryDoc('')).toBe(' ');
    expect(queryDoc('#inbox ')).toBe('#inbox ');
  });

  test('is appended as the user types, and never doubled', () => {
    const view = viewOf('');
    type(view, '#important');
    expect(view.state.doc.toString()).toBe('#important ');
    view.destroy();
  });

  test('the caret stays in front of it', () => {
    const view = viewOf('');
    type(view, '#important');
    expect(view.state.selection.main.head).toBe(10);
    view.destroy();
  });

  test('typing a space of your own does not accumulate two', () => {
    const view = viewOf('');
    type(view, '#a b');
    expect(view.state.doc.toString()).toBe('#a b ');
    view.destroy();
  });

  test('is trimmed off the value callers see', () => {
    expect(queryText('#important ')).toBe('#important');
    expect(queryText('')).toBe('');
  });
});

/**
 * Decorations are fed to a `RangeSetBuilder`, which throws on an out-of-order range. The bare-`#`
 * ranges come from a document scan rather than the syntax tree, so they interleave with the tree's
 * own and have to be sorted before being added.
 */
describe('buildQueryDecorations', () => {
  test.each([
    [' ', 'empty'],
    ['# ', 'a bare hash'],
    ['#important ', 'a tag'],
    ['#a #b #c ', 'several tags'],
    ['type:org.dxos.Person AND #important ', 'a tag following another filter'],
    ['{ name: "x" } #tag ', 'an object literal before a tag'],
    ['"# not a tag" #real ', 'a hash inside a string'],
  ])('builds over %j (%s)', (doc) => {
    expect(() => decorationsOf(doc)).not.toThrow();
  });

  test('a complete tag is a single atomic chip', () => {
    const ranges = decorationsOf('#important ');
    expect(ranges).toMatchObject([{ from: 0, to: 10, atomic: true }]);
  });

  test('a bare hash is highlighted but not yet a chip', () => {
    const ranges = decorationsOf('# ');
    expect(ranges).toMatchObject([{ from: 0, to: 1, atomic: false }]);
  });

  test('a hash inside a string is not treated as a tag', () => {
    expect(decorationsOf('"# not a tag" ').filter((range) => range.from === 1)).toHaveLength(0);
  });
});
