//
// Copyright 2025 DXOS.org
//

import { indentMore } from '@codemirror/commands';
import { getIndentUnit } from '@codemirror/language';
import { type ChangeSpec, EditorState, type Extension, Prec, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { log } from '@dxos/log';
import { mx } from '@dxos/react-ui-theme';

import { outlinerTree, treeFacet } from './tree';

// TODO(burdon): Move items (by key).
// TODO(burdon): Alt+ENTER to create a continuation line.
// TODO(burdon): Smart Cut-and-paste.
// TODO(burdon): Menu option to toggle list/task mode
// TODO(burdon): Convert to task object and insert link (menu button).
// TODO(burdon): Rendered cursor is not fullheight if there is not text on the task line.
// TODO(burdon): When selecting across items, select entire items (don't show selection that spans the gaps).
// TODO(burdon): DND.
// TODO(burdon): What if a different editor "breaks" the layout?

const listItemRegex = /^\s*- (\[ \]|\[x\])? /;

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
  outlinerTree(),
  EditorState.transactionFilter.of((tr) => {
    const tree = tr.state.facet(treeFacet);
    const pos = tr.selection?.ranges[tr.selection?.mainIndex]?.from;
    const item = pos != null ? tree.find(pos) : undefined;

    // Check cursor is in a valid position.
    if (!tr.docChanged) {
      const prev = tr.startState.selection.ranges[tr.startState.selection.mainIndex]?.from;
      if (pos != null) {
        if (item) {
          if (pos < item.contentRange.from || pos > item.contentRange.to) {
            if (pos - prev < 0) {
              const prev = tree.prev(item);
              if (prev) {
                return [{ selection: { anchor: prev.contentRange.to } }];
              } else {
                const first = tree.next(tree.root);
                if (first) {
                  return [{ selection: { anchor: first.contentRange.from } }];
                }

                return [];
              }
            } else {
              return [{ selection: { anchor: item.contentRange.from } }];
            }
          }
        }
      }

      return tr;
    }

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

        // TODO(burdon): Prevent newline if line is empty.
        // TODO(burdon): Handle backspace at start of line (or empty line).

        log.info('change', {
          line: { from: line.from, to: line.to },
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

  /**
   * Line decorations (for border and selection).
   */
  // TODO(burdon): Create widget decorations to make indent uneditable.
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      constructor(view: EditorView) {
        this.updateDecorations(view.state, view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.updateDecorations(update.state, update.view);
        }
      }

      private updateDecorations(state: EditorState, { viewport: { from, to } }: EditorView) {
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

            decorations.push(
              Decoration.line({
                class: mx(
                  'cm-list-item',
                  lineFrom.number === line.number && 'cm-list-item-start',
                  lineTo.number === line.number && 'cm-list-item-end',
                  item === current && 'cm-list-item-selected',
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

  /**
   * Key bindings.
   */
  Prec.highest(
    keymap.of([
      {
        // Indentation.
        key: 'Tab',
        run: (view) => {
          const pos = view.state.selection.ranges[view.state.selection.mainIndex]?.from;
          const tree = view.state.facet(treeFacet);
          const current = tree.find(pos);
          if (current) {
            const previous = tree.prev(current);
            if (previous && current.level <= previous.level) {
              // TODO(burdon): Indent descendants?
              indentMore(view);
            }
          }

          return true;
        },
        shift: (view) => {
          const pos = view.state.selection.ranges[view.state.selection.mainIndex]?.from;
          const tree = view.state.facet(treeFacet);
          const current = tree.find(pos);
          if (current) {
            if (current.level > 0) {
              // Unindent current line and all descendants.
              // NOTE: The markdown extension doesn't provide an indentation service.
              const indentUnit = getIndentUnit(view.state);
              const changes: ChangeSpec[] = [];
              tree.traverse(current, (item) => {
                const line = view.state.doc.lineAt(item.docRange.from);
                changes.push({ from: line.from, to: line.from + indentUnit });
              });

              if (changes.length > 0) {
                view.dispatch({ changes });
              }
            }
          }

          return true;
        },
      },
    ]),
  ),

  EditorView.theme({
    '.cm-list-item': {
      borderLeft: '1px solid var(--dx-separator)',
      borderRight: '1px solid var(--dx-separator)',

      // TODO(burdon): Increase indent padding by configuring decorate extension.
      paddingLeft: '24px',
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
