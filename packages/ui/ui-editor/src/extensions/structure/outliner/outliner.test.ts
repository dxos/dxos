//
// Copyright 2025 DXOS.org
//

import { EditorSelection, EditorState } from '@codemirror/state';
import { type Command, EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { join } from '../../../util';
import { createMarkdownExtensions } from '../../language/markdown';
import { deleteItem, indentItemLess, indentItemMore, moveItemDown, moveItemUp, toggleTask } from './commands';
import { outlinerTree } from './tree';

const LINES = [
  '- [ ] 1',
  '- [ ] 2',
  '  - [ ] 2.1',
  '  - [ ] 2.2',
  '    - 2.2.1',
  '    - 2.2.2',
  '    - 2.2.3',
  '  - [ ] 2.3',
  '- [ ] 3',
];

const DOC = join(...LINES);
const extensions = [createMarkdownExtensions(), outlinerTree()];

// Line-start offset of the nth (0-based) line.
const lineStart = (doc: string, line: number): number =>
  doc
    .split('\n')
    .slice(0, line)
    .reduce((acc, text) => acc + text.length + 1, 0);

// Runs `command` with the caret on `line` and returns the resulting document. A fresh view per call
// (destroyed after) keeps the cases independent and cancels any pending measure — the source of the
// former flakiness that had this suite gated out of CI.
const run = (doc: string, line: number, command: Command): string => {
  const view = new EditorView({ state: EditorState.create({ doc, extensions }) });
  try {
    view.dispatch({ selection: EditorSelection.cursor(lineStart(doc, line)) });
    command(view);
    return view.state.doc.toString();
  } finally {
    view.destroy();
  }
};

describe('outliner commands', () => {
  test('indent carries the whole subtree with its parent', ({ expect }) => {
    // Indenting item "2" nests it under "1"; its descendants must move with it (not become its peers).
    expect(run(DOC, 1, indentItemMore)).to.eq(
      join(
        '- [ ] 1',
        '  - [ ] 2',
        '    - [ ] 2.1',
        '    - [ ] 2.2',
        '      - 2.2.1',
        '      - 2.2.2',
        '      - 2.2.3',
        '    - [ ] 2.3',
        '- [ ] 3',
      ),
    );
  });

  test('indent is a no-op for the first item (nothing to nest under)', ({ expect }) => {
    expect(run(DOC, 0, indentItemMore)).to.eq(DOC);
  });

  test('unindent carries the whole subtree with its parent', ({ expect }) => {
    // Outdent "2.2" (with 2.2.1–2.2.3) from level 2 to level 1.
    expect(run(DOC, 3, indentItemLess)).to.eq(
      join(
        '- [ ] 1',
        '- [ ] 2',
        '  - [ ] 2.1',
        '- [ ] 2.2',
        '  - 2.2.1',
        '  - 2.2.2',
        '  - 2.2.3',
        '  - [ ] 2.3',
        '- [ ] 3',
      ),
    );
  });

  test('unindent is a no-op at the top level', ({ expect }) => {
    expect(run(DOC, 0, indentItemLess)).to.eq(DOC);
  });

  test('move down swaps the item (with its subtree) past the next sibling', ({ expect }) => {
    // "1" moves below "2" and its whole subtree.
    expect(run(DOC, 0, moveItemDown)).to.eq(join(...LINES.slice(1, 8), LINES[0], LINES[8]));
  });

  test('move up swaps the item past the previous sibling', ({ expect }) => {
    // "3" moves above "2"'s subtree, back under "1".
    expect(run(DOC, 8, moveItemUp)).to.eq(join(LINES[0], LINES[8], ...LINES.slice(1, 8)));
  });

  test('delete removes the item and its separator', ({ expect }) => {
    expect(run(DOC, 2, deleteItem)).to.eq(
      join('- [ ] 1', '- [ ] 2', '  - [ ] 2.2', '    - 2.2.1', '    - 2.2.2', '    - 2.2.3', '  - [ ] 2.3', '- [ ] 3'),
    );
  });

  test('toggle turns a bullet into a task and back, preserving indentation', ({ expect }) => {
    const asTask = run(DOC, 4, toggleTask);
    expect(asTask).to.eq(
      join(
        '- [ ] 1',
        '- [ ] 2',
        '  - [ ] 2.1',
        '  - [ ] 2.2',
        '    - [ ] 2.2.1',
        '    - 2.2.2',
        '    - 2.2.3',
        '  - [ ] 2.3',
        '- [ ] 3',
      ),
    );
    // Toggling a task turns it back into a bullet.
    expect(run(DOC, 0, toggleTask)).to.eq(join('- 1', ...LINES.slice(1)));
  });
});
