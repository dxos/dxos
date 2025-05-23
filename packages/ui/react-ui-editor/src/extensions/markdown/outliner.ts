//
// Copyright 2025 DXOS.org
//

import { indentLess, indentMore } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import {
  type ChangeSpec,
  EditorState,
  type Extension,
  type Line,
  Prec,
  type Range,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, keymap } from '@codemirror/view';
import { type SyntaxNode, type Tree } from '@lezer/common';

import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Traversal (e.g., indenting).
// TODO(burdon): State field for current range of active lines (and decoration).
// TODO(burdon): Move items (by key).

// TODO(burdon): Cut-and-paste.
// TODO(burdon): Toggle list/task mode (in gutter?)
// TODO(burdon): Convert to task object and insert link (menu button).
// TOOD(burdon): Continuation lines and rich formatting?
// TODO(burdon): Menu.
// TODO(burdon): DND.

const indentLevel = 2;

const getIndent = (text: string) => (text.match(/^\s*/)?.[0]?.length ?? 0) / indentLevel;

const matchTaskMarker = /^\s*- (\[ \]|\[x\])? /;

/**
 * Get the starting position of text on the given line.
 */
const getLineInfo = (line: Line) => {
  const match = line.text.match(matchTaskMarker);
  const start = line.from + (match?.[0]?.length ?? 0);
  return {
    match, // TODO(burdon): Indicate task or list marker.
    start,
  };
};

/**
 * Outliner extension.
 * - Store outline as a standard markdown document with task and list markers.
 * - Support continuation lines and rich formatting (with Shift+Enter).
 * - Constrain editor to outline structure.
 * - Support smart cut-and-paste.
 * - Support extracted links.
 * - Drag/drop lines or move them via shortcuts.
 */
export const outliner = (): Extension => [
  EditorState.transactionFilter.of((tr) => {
    // Don't allow cursor before marker.
    if (!tr.docChanged) {
      const pos = tr.selection?.ranges[tr.selection?.mainIndex]?.from;
      if (pos != null) {
        const { match, start } = getLineInfo(tr.startState.doc.lineAt(pos));
        if (match) {
          if (pos < start) {
            return [{ selection: { anchor: start, head: start } }];
          }
        }
      }

      return tr;
    }

    const changes: ChangeSpec[] = [];
    tr.changes.iterChanges((fromA, toA, fromB, toB, insert) => {
      // NOTE: Task markers are atomic so will be deleted when backspace is pressed.
      // NOTE: CM inserts 2 or 6 spaces when deleting a list or task marker to create a continuation.
      // - [ ] <- backspace here deletes the task marker.
      // - [ ] <- backspace here inserts 6 spaces (creates continuation).
      //   - [ ] <- backspace here deletes the task marker.

      const line = tr.startState.doc.lineAt(fromA);
      const isTaskMarker = line.text.match(matchTaskMarker);
      if (isTaskMarker) {
        const { start } = getLineInfo(line);

        // Detect and cancel replacement of task marker with continuation indent.
        const replace = start === toA && toA - fromA === insert.length;
        if (replace) {
          log.info('delete line');
          changes.push({ from: line.from - 1, to: toA });
          return;
        }

        // Detect deletion of marker.
        if (fromB === toB) {
          if (toA === line.to) {
            const line = tr.state.doc.lineAt(fromA);
            if (line.text.match(/^\s*$/)) {
              if (line.from === 0) {
                // Don't delete first line.
                log.info('skip');
                changes.push({ from: 0, to: 0 });
                return;
              } else {
                // Delete indent and marker.
                log.info('delete line');
                changes.push({ from: line.from - 1, to: toA });
                return;
              }
            }
          }
          return;
        }

        // TODO(burdon): Intercept tab to manage indentation.

        // TODO(burdon): Detect pressing ENTER on empty line that is indented.
        // Don't allow empty line.
        // if (start === line.to && insert.toString() === '\n') {
        //   log.info('skip');
        //   changes.push({ from: 0, to: 0 });
        //   return;
        // }

        log.info('change', {
          line: { from: line.from, to: line.to },
          start,
          a: [fromA, toA],
          b: [fromB, toB],
          insert: { text: insert.toString(), length: insert.length },
        });
      }
    });

    if (changes.length > 0) {
      return [{ changes }];
    }

    return tr;
  }),

  StateField.define<DecorationSet>({
    create: (state) => {
      return Decoration.set(buildDecorations(0, state.doc.length, state));
    },
    update: (value: DecorationSet, tr: Transaction) => {
      const from = 0;
      const to = tr.state.doc.length;
      return value.map(tr.changes).update({
        filterFrom: 0,
        filterTo: tr.state.doc.length,
        filter: () => false,
        add: buildDecorations(from, to, tr.state),
      });
    },
    provide: (field) => EditorView.decorations.from(field),
  }),

  // TODO(burdon): Maintain state field for each item, indent, pos, etc?
  Prec.highest(
    keymap.of([
      {
        // Indentation.
        key: 'Tab',
        run: (view) => {
          const node = findNode(syntaxTree(view.state), view.state.selection.main.from, 'ListItem');
          if (node) {
            const previous = findPreviousNode(node.node, 'ListItem');
            if (previous) {
              const currentIndent = getIndent(view.state.doc.lineAt(node.from).text);
              const previousIndent = getIndent(view.state.doc.lineAt(previous.from).text);
              if (currentIndent <= previousIndent) {
                indentMore(view);
              }
            }
          }
          return true;
        },
        shift: (view) => {
          const node = findNode(syntaxTree(view.state), view.state.selection.main.from, 'ListItem');
          if (node) {
            const previous = findPreviousNode(node.node, 'ListItem');
            if (previous) {
              const currentIndent = getIndent(view.state.doc.lineAt(node.from).text);
              if (currentIndent > 0) {
                indentLess(view);
                // TODO(burdon): Unindent descendents.
              }
            }
          }
          return true;
        },
      },
    ]),
  ),

  // TODO(burdon): Increase indent padding by configuring decorate extension.
  // TODO(burdon): Hover to select entire group.
  EditorView.theme({
    '.cm-list-item-start': {
      borderTop: '1px solid var(--dx-separator)',
      borderLeft: '1px solid var(--dx-separator)',
      borderRight: '1px solid var(--dx-separator)',
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px',
      paddingTop: '4px',
      marginTop: '8px',
    },
    '.cm-list-item-end': {
      borderLeft: '1px solid var(--dx-separator)',
      borderRight: '1px solid var(--dx-separator)',
      borderBottom: '1px solid var(--dx-separator)',
      borderBottomLeftRadius: '4px',
      borderBottomRightRadius: '4px',
      paddingBottom: '4px',
      marginBottom: '8px',
    },
    '.cm-list-item-continuation': {
      borderLeft: '1px solid var(--dx-separator)',
      borderRight: '1px solid var(--dx-separator)',

      // TODO(burdon): Should match parent indentation.
      paddingLeft: '24px',
    },

    // TODO(burdon): Set via options to decorate extension.
    '.cm-list-item-continuation.cm-codeblock-start': {
      borderRadius: '0',
    },
  }),
];

/**
 * Add line decorations.
 */
const buildDecorations = (from: number, to: number, state: EditorState) => {
  const decorations: Range<Decoration>[] = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'ListItem') {
        const next = findNextNode(node.node, 'ListItem');
        const lineStart = state.doc.lineAt(node.from);
        const lineEnd = next ? state.doc.lineAt(state.doc.lineAt(next.from).from - 1) : state.doc.lineAt(node.to);

        decorations.push(
          Decoration.line({
            class: mx('cm-list-item-start', lineStart.number === lineEnd.number && 'cm-list-item-end'),
          }).range(lineStart.from, lineStart.from),
        );

        // TODO(burdon): Hide continuation indentation so that it can't be deleted.
        for (let i = lineStart.from + 1; i < lineEnd.from; i++) {
          decorations.push(Decoration.line({ class: mx('cm-list-item-continuation') }).range(i, i));
        }

        // TODO(burdon): Need to sort.
        if (lineStart.number !== lineEnd.number) {
          decorations.push(Decoration.line({ class: mx('cm-list-item-end') }).range(lineEnd.from, lineEnd.from));
        }
      }
    },
  });

  return decorations;
};

//
// TODO(burdon): Factor out tree traversal utils.
//

export const findNode = (tree: Tree, pos: number, type: string): SyntaxNode | undefined => {
  const cursor = tree.cursor();
  cursor.moveTo(pos, -1);
  return findNextNode(cursor.node, type);
};

export const findNextNode = (node: SyntaxNode, type: string): SyntaxNode | undefined => {
  const cursor = node.cursor();
  while (cursor.next()) {
    if (cursor.node.name === type) {
      return cursor.node;
    }
  }

  return undefined;
};

export const findPreviousNode = (node: SyntaxNode, type: string): SyntaxNode | undefined => {
  const cursor = node.cursor();
  do {
    if (!cursor.prevSibling()) {
      if (!cursor.parent()) {
        break;
      }
    }
  } while (cursor.node);

  // while (cursor.prevSibling() || cursor.parent()) {
  //   if (cursor.node.name === type) {
  //     return cursor.node;
  //   }
  // }

  return undefined;
};
