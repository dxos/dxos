//
// Copyright 2025 DXOS.org
//

import { type EditorState, type Extension, Prec, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { mx } from '@dxos/ui-theme';

import { decorateMarkdown } from '../../language/markdown';
import { blockSelectionField } from '../blocks';
import { commands } from './commands';
import { outlinerDnd } from './dnd';
import { editor } from './editor';
import { menu } from './menu';
import { getRange, outlinerTree, treeFacet } from './tree';

// ISSUES:
// TODO(burdon): Remove requirement for continuous lines to be indented (so that user's can't accidentally delete them and break the layout).
// TODO(burdon): Prevent unterminated fenced code from breaking subsequent items ("firewall" markdown parsing within each item?)
// TODO(burdon): What if a different editor "breaks" the layout?
// TODO(burdon): Check Automerge recognizes text that is moved/indented (e.g., concurrent editing item while being moved).

// NEXT:
// TODO(burdon): Update selection when adding/removing items.
// TODO(burdon): When selecting across items, select entire items (don't show selection that spans the gaps).
// TODO(burdon): Handle backspace at start of line (or empty line).
// TODO(burdon): Convert to task object and insert link (menu button).
// TODO(burdon): Smart Cut-and-paste.

export type OutlinerProps = {};

/**
 * Outliner extension.
 * - Stores outline as a standard markdown document with task and list markers.
 * - Supports continuation lines and rich formatting (with Shift+Enter).
 * - Constrains editor to outline structure.
 * - Supports smart cut-and-paste.
 */
export const outliner = (_options: OutlinerProps = {}): Extension => [
  // Commands.
  Prec.highest(commands()),

  // State.
  outlinerTree(),

  // Filter and possibly modify changes.
  editor(),

  // Block selection, drag-to-reorder, highlight, and clipboard (built on the `blocks` extensions).
  outlinerDnd(),

  // Current-item indicator (the selection highlight is drawn by `outlinerDnd`).
  decorations(),

  // Default markdown decorations.
  decorateMarkdown({ listPaddingLeft: 8 }),

  // Floating menu (reserve space).
  menu(),

  // Centered content column; the grip (left) and menu (right) float in the ~3rem margins on each side.
  EditorView.contentAttributes.of({ class: 'mx-auto w-full max-w-[min(50rem,100%-6rem)]' }),
];

/**
 * Structural row layout plus a subtle border on the current (caret) item. The selection highlight is
 * drawn by `outlinerDnd` (the shared `blocks` layer), so this no longer renders selection.
 */
const decorations = () => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      constructor(view: EditorView) {
        this.updateDecorations(view.state, view);
      }

      update(update: ViewUpdate) {
        const selectionChanged =
          update.startState.field(blockSelectionField, false) !== update.state.field(blockSelectionField, false);
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
        const tree = state.facet(treeFacet);
        const current = tree.find(state.selection.main.from);
        const doc = state.doc;

        // The block selection stores each selected item's line-start anchor; a line is selected when it
        // falls within any selected item's subtree. Rendered as a line background (not the `blocks`
        // RectangleMarker layer) so it stays aligned to the actual rows.
        const selectedRanges = (state.field(blockSelectionField, false) ?? [])
          .map((anchor) => {
            const item = tree.find(anchor);
            return item ? getRange(tree, item) : null;
          })
          .filter((range): range is [number, number] => range != null);
        const isSelected = (pos: number) =>
          selectedRanges.some(([rangeFrom, rangeTo]) => pos >= rangeFrom && pos <= rangeTo);

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
                  isSelected(line.from) && 'cm-list-item-selected',
                  hasFocus && item === current && 'cm-list-item-current',
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
      // borderLeftWidth: '1px',
      // borderRightWidth: '1px',
      paddingLeft: '32px',
      borderColor: 'transparent',
    },
    '.cm-list-item.cm-codeblock-start': {
      borderRadius: '0',
    },

    // No vertical margins: CodeMirror's gutter/height-map measures each line's border-box but not its
    // margins, so any inter-row margin makes the drag grips drift further from center down the list (and
    // shows as gaps between selected rows). Keep row spacing in the padding, which CM does measure.
    '.cm-list-item-start': {
      // borderTopWidth: '1px',
      // borderTopLeftRadius: '4px',
      // borderTopRightRadius: '4px',
      paddingTop: '4px',
    },
    '.cm-list-item-end': {
      // borderBottomWidth: '1px',
      // borderBottomLeftRadius: '4px',
      // borderBottomRightRadius: '4px',
      paddingBottom: '4px',
    },

    // Accent background behind the selected subtree; flat so adjacent selected rows read as one region.
    '.cm-list-item-selected': {
      boxSizing: 'border-box',
      backgroundColor: 'var(--color-cm-highlight-surface)',
      borderRadius: '0',
    },
    // Subtle border on the item under the caret; distinct from the accent selection highlight.
    '.cm-list-item-current': {
      borderColor: 'var(--color-focus-ring-subtle)',
    },
  }),
];
