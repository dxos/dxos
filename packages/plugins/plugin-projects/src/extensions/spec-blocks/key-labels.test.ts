//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { SOFTWARE_DIALECT } from '@dxos/deus/schema';

import { continueKeyedLine, keyLabelDecorations, keyLabels, removeEmptyKeyedLine } from './key-labels.ts';
import { specBlocksConfig, specBlocksField } from './spec-blocks-state.ts';

const TEXT = [
  '```mdl',
  'feat k7q2x: Sorted inbox',
  '  req a2b3c: A message from a known sender goes to its folder.',
  '```',
  '',
  '```mdl',
  'feat m4n5p: Folder rules',
  '  depends: [k7q2x]',
  '  req q8r9s: A rule names a folder.',
  '```',
  '',
].join('\n');

const create = (doc: string, anchor = 0) =>
  EditorState.create({
    doc,
    selection: { anchor },
    extensions: [specBlocksConfig.of({ dialects: [SOFTWARE_DIALECT] }), specBlocksField, keyLabelDecorations],
  });

const after = (doc: string, text: string) => doc.indexOf(text) + text.length;

describe('keyLabels', () => {
  test('labels each key where the text writes it, references included', ({ expect }) => {
    const labels = keyLabels(create(TEXT)).map(({ from, to, key, label }) => ({
      key,
      label,
      text: TEXT.slice(from, to),
    }));
    expect(labels).toEqual([
      { key: 'k7q2x', label: 'F-1', text: 'k7q2x' },
      { key: 'a2b3c', label: 'F-1.1', text: 'a2b3c' },
      { key: 'm4n5p', label: 'F-2', text: 'm4n5p' },
      { key: 'k7q2x', label: 'F-1', text: 'k7q2x' },
      { key: 'q8r9s', label: 'F-2.1', text: 'q8r9s' },
    ]);
  });

  test('Enter in a requirement starts the next one with a fresh key, and on an empty one ends the list', ({
    expect,
  }) => {
    const start = create(TEXT, after(TEXT, 'goes to its folder.'));
    const next = start.update(continueKeyedLine(start)!).state;
    const added = next.doc.toString().match(/\n {2}req (\w{5}): \n```/);
    expect(added).not.toBeNull();
    expect(next.selection.main.head).toBe(next.doc.toString().indexOf(added![0]) + added![0].length - 4);
    expect(keyLabels(next).map(({ label }) => label)).toContain('F-1.2');

    const ended = next.update(continueKeyedLine(next)!).state;
    expect(ended.doc.toString()).toBe(TEXT.replace('its folder.\n', 'its folder.\n  \n'));
  });

  test('Backspace on an empty requirement removes its line', ({ expect }) => {
    const doc = TEXT.replace('its folder.\n', 'its folder.\n  req z2y3x: \n');
    const state = create(doc, after(doc, 'req z2y3x: '));
    const removed = state.update(removeEmptyKeyedLine(state)!).state;
    expect(removed.doc.toString()).toBe(TEXT);
    expect(removed.selection.main.head).toBe(after(TEXT, 'goes to its folder.'));
    expect(removeEmptyKeyedLine(create(TEXT, after(TEXT, 'req a2b3c: ')))).toBeUndefined();
  });

  test('copying a label alone copies the label; a wider selection copies the text', ({ expect }) => {
    const copy = (from: number, to: number) => {
      const state = create(TEXT).update({ selection: { anchor: from, head: to } }).state;
      return state
        .facet(EditorView.clipboardOutputFilter)
        .reduce((text, filter) => filter(text, state), state.sliceDoc(from, to));
    };
    const key = TEXT.indexOf('a2b3c');
    expect(copy(key, key + 5)).toBe('F-1.1');
    expect(copy(key, key + 7)).toBe('a2b3c: ');
  });

  test('a typed edit that changes part of a key is dropped; one that removes the whole item is kept', ({ expect }) => {
    const state = create(TEXT);
    const type = (from: number, to: number, insert = '') =>
      state.update({ changes: { from, to, insert }, userEvent: insert ? 'input.type' : 'delete.backward' }).state.doc;

    const key = TEXT.indexOf('a2b3c');
    expect(type(key + 2, key + 2, 'x')).toBe(state.doc);
    expect(type(key + 5, key + 6)).toBe(state.doc);
    // Joining a requirement's line to the one above.
    expect(type(key - '\n  req '.length, key - '  req '.length)).toBe(state.doc);
    expect(type(TEXT.indexOf('k7q2x'), TEXT.indexOf('k7q2x') + 1)).toBe(state.doc);

    const line = state.doc.lineAt(key);
    expect(type(line.from - 1, line.to).toString()).toBe(TEXT.replace(/\n {2}req a2b3c:[^\n]*/, ''));
    expect(type(after(TEXT, 'goes to'), after(TEXT, 'goes to'), ' straight').toString()).toContain(
      'goes to straight its folder.',
    );

    // Typing before a requirement's indent is dropped; a line break there, or a paste that keeps one, is kept.
    expect(type(line.from, line.from, 'x')).toBe(state.doc);
    expect(type(line.from, line.from, '\n').toString()).toContain('Sorted inbox\n\n  req a2b3c');
    expect(type(line.from - 3, line.from, '!\n').toString()).toContain('Sorted inb!\n  req a2b3c');
  });

  test('a key written with spaces before its colon is guarded through the colon', ({ expect }) => {
    const doc = TEXT.replace('feat k7q2x:', 'feat k7q2x :').replace('req a2b3c:', 'req a2b3c :');
    const state = create(doc);
    const type = (at: number, insert: string) =>
      state.update({ changes: { from: at, insert }, userEvent: 'input.type' }).state.doc;
    expect(type(after(doc, 'k7q2x'), 'x')).toBe(state.doc);
    expect(type(after(doc, 'a2b3c'), 'x')).toBe(state.doc);
    expect(type(after(doc, 'a2b3c : '), 'Always: ').toString()).toContain('req a2b3c : Always: A message');
  });

  test('a referenced key is guarded and labelled outside its note', ({ expect }) => {
    const doc = TEXT.replace('depends: [k7q2x]', 'depends: [k7q2x]  # split from q8r9s');
    const state = create(doc);
    expect(keyLabels(state).filter(({ key }) => key === 'q8r9s')).toHaveLength(1);

    const reference = doc.indexOf('[k7q2x]') + 1;
    const edit = (from: number, to: number, insert = '') =>
      state.update({ changes: { from, to, insert }, userEvent: insert ? 'input.type' : 'delete.backward' }).state.doc;
    expect(edit(reference + 5, reference + 5, 'x')).toBe(state.doc);
    expect(edit(reference, reference, 'x')).toBe(state.doc);
    expect(edit(reference + 2, reference + 3)).toBe(state.doc);
    expect(edit(reference, reference + 5).toString()).toContain('depends: []');
    expect(edit(reference + 5, reference + 5, ', ').toString()).toContain('depends: [k7q2x, ]');
  });

  test('Enter after spaces at the end of a requirement starts the next one', ({ expect }) => {
    const doc = TEXT.replace('its folder.\n', 'its folder.  \n');
    const state = create(doc, after(doc, 'its folder.  '));
    const next = state.update(continueKeyedLine(state)!).state;
    expect(next.doc.toString()).toMatch(/its folder\. {2}\n {2}req \w{5}: \n```/);
  });
});
