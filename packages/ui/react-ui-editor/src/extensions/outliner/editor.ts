//
// Copyright 2025 DXOS.org
//

import { type ChangeSpec, EditorSelection, EditorState } from '@codemirror/state';
import { type EditorView, ViewPlugin } from '@codemirror/view';

import { log } from '@dxos/log';

import { getSelection } from './selection';
import { treeFacet } from './tree';

const LIST_ITEM_REGEX = /^\s*- (\[ \]|\[x\])? /;

/**
 * Initialize empty document.
 */
const initialize = () => {
  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        const first = view.state.doc.lineAt(0);
        const text = view.state.sliceDoc(first.from, first.to);
        const match = text.match(LIST_ITEM_REGEX);
        if (!match) {
          setTimeout(() => {
            const insert = '- [ ] ';
            view.dispatch({
              changes: [{ from: 0, to: 0, insert }],
              selection: EditorSelection.cursor(insert.length),
            });
          });
        }
      }
    },
  );
};

/**
 * Handle cursor movement, selection, and editing.
 */
export const editor = () => [
  initialize(),

  EditorState.transactionFilter.of((tr) => {
    const tree = tr.state.facet(treeFacet);

    //
    // Check cursor is in a valid position.
    //
    if (!tr.docChanged) {
      const current = getSelection(tr.state).from;
      if (current != null) {
        const currentItem = tree.find(current);
        if (!currentItem) {
          return [];
        }

        // Check if outside of editable range.
        if (current < currentItem.contentRange.from || current > currentItem.contentRange.to) {
          const prev = getSelection(tr.startState).from;
          const prevItem = prev != null ? tree.find(prev) : undefined;
          if (!prevItem) {
            return [{ selection: EditorSelection.cursor(currentItem.contentRange.from) }];
          } else {
            if (currentItem.index < prevItem.index) {
              // Moving line up.
              return [{ selection: EditorSelection.cursor(currentItem.contentRange.to) }];
            } else if (currentItem.index > prevItem.index) {
              // Moving line down.
              return [{ selection: EditorSelection.cursor(currentItem.contentRange.from) }];
            } else {
              // Moving left.
              if (current < prev) {
                if (currentItem.index === 0) {
                  // At start of the list.
                  return [];
                } else {
                  // Go to previous line.
                  return [{ selection: EditorSelection.cursor(currentItem.lineRange.from - 1) }];
                }
              } else {
                // Go to end of line.
                return [{ selection: EditorSelection.cursor(currentItem.contentRange.to) }];
              }
            }
          }
        }
      }

      return tr;
    }

    //
    // Validate changes that don't break the tree.
    //
    let cancel = false;
    const changes: ChangeSpec[] = [];
    tr.changes.iterChanges((fromA, toA, fromB, toB, insert) => {
      const line = tr.startState.doc.lineAt(fromA);
      const match = line.text.match(LIST_ITEM_REGEX);
      if (match) {
        // Check cursor was in a valid position.
        const startTree = tr.startState.facet(treeFacet);
        const startItem = startTree.find(tr.startState.selection.main.from);

        // Check if entire line was deleted (which is ok).
        const deleteLine = fromA === startItem?.lineRange.from && toA === startItem?.lineRange.to + 1;
        if (deleteLine) {
          return;
        }

        // if (!deleteLine && (!startItem || fromA < startItem.contentRange.from || toA > startItem.contentRange.to)) {
        //   cancel = true;
        //   return;
        // }

        // Check valid item.
        const currentItem = tree.find(tr.state.selection.main.from);
        if (!currentItem?.contentRange) {
          cancel = true;
          return;
        }

        // Detect and cancel replacement of task marker with continuation indent.
        // Task markers are atomic so will be deleted when backspace is pressed.
        // The markdown extension inserts 2 or 6 spaces when deleting a list or task marker in order to create a continuation.
        // - [ ] <- backspace here deletes the task marker.
        // - [ ] <- backspace here inserts 6 spaces (creates continuation).
        //   - [ ] <- backspace here deletes the task marker.
        const start = line.from + (match?.[0]?.length ?? 0);
        const replace = start === toA && toA - fromA === insert.length;
        if (replace) {
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
                cancel = true;
                return;
              } else {
                // Delete indent and marker.
                changes.push({ from: line.from - 1, to: toA });
                return;
              }
            }
          }
          return;
        }

        // Prevent newline if line is empty.
        const item = tree.find(fromA);
        if (item?.contentRange.from === item?.contentRange.to && fromA === toA) {
          cancel = true;
          return;
        }

        log('change', {
          item,
          line: { from: line.from, to: line.to },
          a: [fromA, toA],
          b: [fromB, toB],
          insert: { text: insert.toString(), length: insert.length },
        });
      }
    });

    if (changes.length > 0) {
      log('modified,', { changes });
      return [{ changes }];
    } else if (cancel) {
      log('cancel');
      return [];
    }

    return tr;
  }),
];
