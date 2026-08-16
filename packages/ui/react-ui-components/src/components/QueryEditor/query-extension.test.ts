//
// Copyright 2026 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, expect, test } from 'vitest';

import { Tag } from '@dxos/echo';
import { getHashHue } from '@dxos/ui-theme';

import { buildQueryDecorations, query } from './query-extension';

const tag = Tag.make({ label: 'important' });
const tags: Tag.Map = { [tag.id]: tag };
const hue = tag.hue ?? getHashHue(tag.id);

/**
 * A tag is one object: a widget REPLACES its text, atomically, wherever the caret is — including at
 * the tag's own edges, so Backspace against it removes the whole chip rather than a character of the
 * label. It is still typed a character at a time, since an insertion at the range's boundary lands
 * outside it and grows the node.
 */
describe('tag rendering', () => {
  test('is an atomic chip when the caret is elsewhere', async () => {
    const view = await viewOf('#important AND #other', 0);
    expect(decorationsOf(view)).toMatchObject([
      { from: 0, to: 10, atomic: true },
      { from: 11, to: 14, atomic: true },
      { from: 15, to: 21, atomic: true },
    ]);
    view.destroy();
  });

  test('stays an atomic chip with the caret inside it', async () => {
    const view = await viewOf('#important', 5);
    expect(decorationsOf(view)).toMatchObject([{ from: 0, to: 10, atomic: true }]);
    view.destroy();
  });

  test('stays an atomic chip with the caret at its trailing edge', async () => {
    // Regression: the caret lands here both while the tag is being typed and after `End`, and an
    // exception for it left Backspace deleting a character of the label instead of the whole tag.
    const view = await viewOf('#important', 10);
    expect(decorationsOf(view)).toMatchObject([{ from: 0, to: 10, atomic: true }]);
    view.destroy();
  });

  test('a bare `#` is marked from the keystroke that opens it', async () => {
    // The grammar needs a label character before it accepts a `Tag`, so this comes from a document
    // scan rather than the tree — the affordance cannot wait for the parse to succeed.
    const view = await viewOf('#', 1);
    expect(decorationsOf(view)).toMatchObject([{ from: 0, to: 1, atomic: false }]);
    view.destroy();
  });

  test('every tag is a chip, wherever the caret is', async () => {
    const view = await viewOf('#alpha #beta', 12);
    const ranges = decorationsOf(view);
    expect(ranges.filter((range) => range.atomic).map(({ from, to }) => [from, to])).toEqual([
      [0, 6],
      [7, 12],
    ]);
    view.destroy();
  });

  test('the label is rendered once', async () => {
    const view = await viewOf('#important', 10);
    expect(view.contentDOM.textContent).toBe('#important');
    view.destroy();
  });
});

/**
 * Decorations are fed to a `RangeSetBuilder`, which throws on an out-of-order range. The bare-`#`
 * ranges come from a document scan rather than the syntax tree, so they interleave with the tree's
 * own and have to be sorted before being added.
 */
describe('buildQueryDecorations', () => {
  test.each([
    ['', 'empty'],
    ['#', 'a bare hash'],
    ['#important', 'a tag'],
    ['#a #b #c', 'several tags'],
    ['type:org.dxos.Person AND #important', 'a tag following another filter'],
    ['{ name: "x" } #tag', 'an object literal before a tag'],
    ['"# not a tag" #real', 'a hash inside a string'],
  ])('builds over %j (%s)', async (doc) => {
    const view = await viewOf(doc);
    expect(() => decorationsOf(view)).not.toThrow();
    view.destroy();
  });

  test('a hash inside a string is not treated as a tag', async () => {
    const view = await viewOf('"# not a tag"', 0);
    expect(decorationsOf(view).filter((range) => range.from === 1)).toHaveLength(0);
    view.destroy();
  });

  test('the chip is drawn in the tag hue', async () => {
    const view = await viewOf('#important', 10);
    // The hue lives in the widget's own DOM, so it is read off the rendered chip rather than a spec.
    const classes = [...view.contentDOM.querySelectorAll('span')].map((el) => el.className);
    expect(classes.some((className) => className.includes(hue))).toBe(true);
    view.destroy();
  });
});

/**
 * Tags are atomic, so text must never end up glued to one — and there has to be a position at the end
 * of the document that is not adjacent to a chip.
 */
describe('spacing', () => {
  test('typing immediately before a tag is separated from it', async () => {
    const view = await viewOf('#important', 0);
    view.dispatch({ changes: { from: 0, insert: 'a' }, selection: EditorSelection.cursor(1) });
    expect(view.state.doc.toString()).toBe('a #important ');
    expect(view.state.selection.main.head).toBe(1);
    view.destroy();
  });

  test('an insertion leaves a trailing space', async () => {
    const view = await viewOf('#a', 2);
    view.dispatch({ changes: { from: 2, insert: 'b' }, selection: EditorSelection.cursor(3) });
    expect(view.state.doc.toString()).toBe('#ab ');
    // The caret stays before the trailing space, so typing continues to extend the tag.
    expect(view.state.selection.main.head).toBe(3);
    view.destroy();
  });

  test('the trailing space is not re-added after a deletion', async () => {
    const view = await viewOf('#a ', 3);
    view.dispatch({ changes: { from: 2, to: 3 } });
    expect(view.state.doc.toString()).toBe('#a');
    view.destroy();
  });

  test('an empty document is left empty, so the placeholder shows', async () => {
    const view = await viewOf('x', 1);
    view.dispatch({ changes: { from: 0, to: 1 } });
    expect(view.state.doc.toString()).toBe('');
    view.destroy();
  });
});

/**
 * A mounted, focused view. Focus matters: the tag under the caret is only drawn as live text while the
 * editor has it, so a blurred editor shows chips throughout.
 */
const viewOf = async (doc: string, head = doc.length) => {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const view = new EditorView({
    state: EditorState.create({ doc, selection: EditorSelection.cursor(head), extensions: [query({ tags })] }),
    parent,
  });
  view.contentDOM.dispatchEvent(new FocusEvent('focus'));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return view;
};

const decorationsOf = (view: EditorView) => {
  const ranges: { from: number; to: number; atomic: boolean; class?: string }[] = [];
  const cursor = buildQueryDecorations(view.state, { tags }).iter();
  while (cursor.value) {
    ranges.push({
      from: cursor.from,
      to: cursor.to,
      atomic: !!cursor.value.spec.atomic,
      class: cursor.value.spec.class,
    });
    cursor.next();
  }

  return ranges;
};
