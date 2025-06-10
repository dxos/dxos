//
// Copyright 2025 DXOS.org
//

import { type ChangeSpec, EditorSelection, EditorState, type Extension, Prec, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';

import { commands } from './commands';
import { selectionCompartment, selectionFacet, getSelection, selectionEquals } from './selection';
import { outlinerTree, treeFacet } from './tree';

// ISSUES:
// TODO(burdon): Remove requirement for continuous lines to be indented (so that user's can't accidentally delete them and break the layout).
// TODO(burdon): Prevent unterminated fenced code from breaking subsequent items ("firewall" markdown parsing within each item?)
// TODO(burdon): What if a different editor "breaks" the layout?
// TODO(burdon): Check Automerge recognizes text that is moved/indented (e.g., concurrent editing item while being moved).
// TODO(burdon): Rendered cursor is not full height if there is not text on the task line.

// NEXT:
// TODO(burdon): Update selection when adding/removing items.
// TODO(burdon): When selecting across items, select entire items (don't show selection that spans the gaps).
// TODO(burdon): Handle backspace at start of line (or empty line).
// TODO(burdon): Convert to task object and insert link (menu button).
// TODO(burdon): Smart Cut-and-paste.
// TODO(burdon): Menu.
// TODO(burdon): DND.

const listItemRegex = /^\s*- (\[ \]|\[x\])? /;

/**
 * Outliner extension.
 * - Stores outline as a standard markdown document with task and list markers.
 * - Supports continuation lines and rich formatting (with Shift+Enter).
 * - Constrains editor to outline structure.
 * - Supports smart cut-and-paste.
 */
export const outliner = (): Extension => [
  // State.
  outlinerTree(),

  // Selection.
  selectionCompartment.of(selectionFacet.of([])),

  // Commands.
  Prec.highest(commands()),

  // Filter and possibly modify changes.
  EditorState.transactionFilter.of((tr) => {
    const tree = tr.state.facet(treeFacet);

    // Check cursor is in a valid position.
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
              // Moving up.
              return [{ selection: EditorSelection.cursor(currentItem.contentRange.to) }];
            } else if (currentItem.index > prevItem.index) {
              // Moving down.
              return [{ selection: EditorSelection.cursor(currentItem.contentRange.from) }];
            } else {
              if (current < prev) {
                // Moving left.
                if (currentItem.index === 0) {
                  return [];
                } else {
                  return [{ selection: EditorSelection.cursor(currentItem.lineRange.from - 1) }];
                }
              }
            }
          }
        }
      }

      return tr;
    }

    let cancel = false;
    const changes: ChangeSpec[] = [];
    tr.changes.iterChanges((fromA, toA, fromB, toB, insert) => {
      const line = tr.startState.doc.lineAt(fromA);
      const match = line.text.match(listItemRegex);
      if (match) {
        const start = line.from + (match?.[0]?.length ?? 0);

        // Detect and cancel replacement of task marker with continuation indent.
        // Task markers are atomic so will be deleted when backspace is pressed.
        // The markdown extension inserts 2 or 6 spaces when deleting a list or task marker in order to create a continuation.
        // - [ ] <- backspace here deletes the task marker.
        // - [ ] <- backspace here inserts 6 spaces (creates continuation).
        //   - [ ] <- backspace here deletes the task marker.
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

  /**
   * Line decorations (for border and selection).
   */
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      constructor(view: EditorView) {
        this.updateDecorations(view.state, view);
      }

      update(update: ViewUpdate) {
        const selectionChanged = !selectionEquals(
          update.state.facet(selectionFacet),
          update.startState.facet(selectionFacet),
        );

        if (update.docChanged || update.viewportChanged || update.selectionSet || selectionChanged) {
          this.updateDecorations(update.state, update.view);
        }
      }

      private updateDecorations(state: EditorState, { viewport: { from, to } }: EditorView) {
        const selection = state.facet(selectionFacet);
        const tree = state.facet(treeFacet);
        const current = tree.find(state.selection.ranges[state.selection.mainIndex]?.from);
        const doc = state.doc;

        const decorations: Range<Decoration>[] = [];
        for (let lineNum = doc.lineAt(from).number; lineNum <= doc.lineAt(to).number; lineNum++) {
          const line = doc.line(lineNum);
          const item = tree.find(line.from);
          if (item) {
            const lineFrom = doc.lineAt(item.contentRange.from);
            const lineTo = doc.lineAt(item.contentRange.to);
            const isSelected = selection.includes(item.index) || item === current;

            decorations.push(
              Decoration.line({
                class: mx(
                  'cm-list-item',
                  lineFrom.number === line.number && 'cm-list-item-start',
                  lineTo.number === line.number && 'cm-list-item-end',
                  isSelected && 'cm-list-item-selected',
                ),
              }).range(line.from, line.from),
            );
          }
        }

        this.decorations = Decoration.set(decorations);
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  ),

  EditorView.theme({
    '.cm-list-item': {
      borderLeft: '1px solid var(--dx-separator)',
      borderRight: '1px solid var(--dx-separator)',
      paddingLeft: '32px',
    },
    '.cm-list-item.cm-codeblock-start': {
      borderRadius: '0',
    },

    '.cm-list-item-start': {
      borderTop: '1px solid var(--dx-separator)',
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px',
      paddingTop: '4px',
      marginTop: '8px',
    },
    '.cm-list-item-end': {
      borderBottom: '1px solid var(--dx-separator)',
      borderBottomLeftRadius: '4px',
      borderBottomRightRadius: '4px',
      paddingBottom: '4px',
      marginBottom: '8px',
    },

    '.cm-list-item-selected': {
      borderColor: 'var(--dx-cmSeparator)',
    },
  }),
];
