//
// Copyright 2026 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { table } from './table.ts';

const renderTable = (doc: string) => {
  const parent = document.createElement('div');
  const view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [markdown({ base: markdownLanguage }), table(), EditorState.readOnly.of(true)],
    }),
    parent,
  });
  const cells = (selector: string) =>
    Array.from(view.dom.querySelectorAll(selector)).map((row) =>
      Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent),
    );
  const result = { header: cells('thead tr'), rows: cells('tbody tr') };
  view.destroy();
  return result;
};

describe('table extension', () => {
  test('keeps an empty header cell, so the columns after it stay aligned', ({ expect }) => {
    const { header, rows } = renderTable(
      ['| Error | Plugin failed | |', '| --- | --- | --- |', '| before | 4 | 4 |', '| after | 0 | 0 |'].join('\n'),
    );
    expect(header).toEqual([['Error', 'Plugin failed', '']]);
    expect(rows).toEqual([
      ['before', '4', '4'],
      ['after', '0', '0'],
    ]);
  });

  test('keeps empty body cells and pads short rows to the column count', ({ expect }) => {
    const { header, rows } = renderTable(['| A | B | C |', '| --- | --- | --- |', '| 1 | | 3 |', '| 4 |'].join('\n'));
    expect(header).toEqual([['A', 'B', 'C']]);
    expect(rows).toEqual([
      ['1', '', '3'],
      ['4', '', ''],
    ]);
  });

  test('does not split on an escaped pipe', ({ expect }) => {
    const { rows } = renderTable(['| A | B |', '| --- | --- |', '| a \\| b | c |'].join('\n'));
    expect(rows).toEqual([['a | b', 'c']]);
  });
});
