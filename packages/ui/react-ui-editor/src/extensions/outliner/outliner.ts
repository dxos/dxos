//
// Copyright 2025 DXOS.org
//

import { type EditorState, type Extension, Prec, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { mx } from '@dxos/react-ui-theme';

import { commands } from './commands';
import { editor } from './editor';
import { selectionCompartment, selectionFacet, selectionEquals } from './selection';
import { outlinerTree, treeFacet } from './tree';
import { decorateMarkdown } from '../markdown/decorate';

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

/**
 * Outliner extension.
 * - Stores outline as a standard markdown document with task and list markers.
 * - Supports continuation lines and rich formatting (with Shift+Enter).
 * - Constrains editor to outline structure.
 * - Supports smart cut-and-paste.
 */
export const outliner = (): Extension => [
  // Commands.
  Prec.highest(commands()),

  // State.
  outlinerTree(),

  // Selection.
  selectionCompartment.of(selectionFacet.of([])),

  // Filter and possibly modify changes.
  editor(),

  // Line decorations.
  decorations(),

  // Default markdown decorations.
  decorateMarkdown({ listPaddingLeft: 8 }),
];

/**
 * Line decorations (for border and selection).
 */
const decorations = () => [
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

        if (
          update.focusChanged ||
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet ||
          selectionChanged
        ) {
          this.updateDecorations(update.state, update.view);
        }
      }

      private updateDecorations(state: EditorState, { viewport: { from, to }, hasFocus }: EditorView) {
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
                  hasFocus && isSelected && 'cm-list-item-selected',
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

  // Theme.
  EditorView.theme({
    '.cm-list-item': {
      borderLeftWidth: '1px',
      borderRightWidth: '1px',
      paddingLeft: '32px',
      borderColor: 'transparent',
    },
    '.cm-list-item.cm-codeblock-start': {
      borderRadius: '0',
    },

    '.cm-list-item-start': {
      borderTopWidth: '1px',
      borderTopLeftRadius: '4px',
      borderTopRightRadius: '4px',
      paddingTop: '4px',
      marginTop: '8px',
    },

    '.cm-list-item-end': {
      borderBottomWidth: '1px',
      borderBottomLeftRadius: '4px',
      borderBottomRightRadius: '4px',
      paddingBottom: '4px',
      marginBottom: '8px',
    },

    // TODO(burdon): Focus state.
    '.cm-list-item-selected': {
      borderColor: 'var(--dx-focus-ring)',
    },
  }),
];
