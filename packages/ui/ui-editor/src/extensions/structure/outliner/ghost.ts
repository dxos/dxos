//
// Copyright 2026 DXOS.org
//

import { EditorSelection, type Extension } from '@codemirror/state';
import {
  type Command,
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';

import { type CleanupFn, addEventListener } from '@dxos/async';
import { Domino } from '@dxos/ui';

import { PlaceholderWidget } from '../../completion/placeholder.ts';
import { GUTTER_WIDTH } from '../blocks/index.ts';
import { treeFacet } from './tree.ts';

export type GhostOptions = {
  /** Placeholder shown in an empty item. */
  item?: string;
  /** Accessible label of the add-task button shown beside a blank line. */
  add?: string;
};

const DEFAULTS: Required<GhostOptions> = { item: 'Enter task', add: 'Add task' };

const TASK_MARKER = '- [ ] ';

// The marker as written, so the placeholder's slot comes from the line text rather than from the tree:
// the tree can lag the parser by a transaction, and a stale content start would sit under the checkbox.
const EMPTY_ITEM_REGEX = /^\s*- (?:\[[ x]\] )?$/;

/** Turns the caret's blank line into an empty task and places the caret in it. */
export const insertTaskAtLine: Command = (view) => {
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  if (line.text.trim() !== '' || view.state.facet(treeFacet).find(line.from)) {
    return false;
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: TASK_MARKER },
    selection: EditorSelection.cursor(line.from + TASK_MARKER.length),
  });
  view.focus();
  return true;
};

/**
 * Hints at what an empty row wants: an empty item shows a placeholder in its content, and a blank line
 * shows an add button where the item's grip would be. Both follow the caret and need focus.
 */
export const ghost = (options: GhostOptions = {}): Extension => {
  const { item, add } = { ...DEFAULTS, ...options };

  return [
    // Empty item: placeholder at the content start.
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet = Decoration.none;

        constructor(view: EditorView) {
          this.decorations = this.compute(view);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.selectionSet || update.focusChanged) {
            this.decorations = this.compute(update.view);
          }
        }

        private compute(view: EditorView): DecorationSet {
          if (!view.hasFocus) {
            return Decoration.none;
          }
          const line = view.state.doc.lineAt(view.state.selection.main.head);
          if (!EMPTY_ITEM_REGEX.test(line.text) || !view.state.facet(treeFacet).find(line.from)) {
            return Decoration.none;
          }
          return Decoration.set([Decoration.widget({ widget: new PlaceholderWidget(item), side: 1 }).range(line.to)]);
        }
      },
      { decorations: (plugin) => plugin.decorations },
    ),

    // Blank line: an add button floating in the grip gutter, positioned like the menu trigger.
    ViewPlugin.fromClass(
      class {
        readonly view: EditorView;
        readonly button: HTMLElement;
        rafId: number | null = null;
        cleanup?: CleanupFn;

        constructor(view: EditorView) {
          this.view = view;
          const container = view.scrollDOM;
          if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
          }

          // A control-sized box around the button, as the grip is built, so the two gutter controls share
          // one hit area and centre.
          const button = Domino.of('button')
            .classNames('grid size-6 place-items-center rounded-xs hover:bg-hover-surface')
            .attributes({ 'type': 'button', 'aria-label': add, 'title': add })
            .append(Domino.of('div').classNames('cm-outliner-add-icon').append(Domino.svg('ph--plus--regular')));
          this.button = Domino.of('div').classNames('cm-outliner-add').append(button).root;
          // `mousedown` rather than `click`: the click would first blur the editor and hide the button.
          button.root.addEventListener('mousedown', (event) => {
            event.preventDefault();
            insertTaskAtLine(this.view);
          });
          this.button.style.display = 'none';
          container.appendChild(this.button);

          const handler = () => this.schedule();
          this.cleanup = addEventListener(document, 'scroll', handler, { capture: true, passive: true });
          this.schedule();
        }

        destroy() {
          this.cleanup?.();
          this.button.remove();
          if (this.rafId != null) {
            cancelAnimationFrame(this.rafId);
          }
        }

        update(update: ViewUpdate) {
          if (
            update.docChanged ||
            update.focusChanged ||
            update.geometryChanged ||
            update.selectionSet ||
            update.viewportChanged
          ) {
            this.schedule();
          }
        }

        schedule() {
          if (this.rafId != null) {
            cancelAnimationFrame(this.rafId);
          }
          this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            this.position();
          });
        }

        position() {
          const { state } = this.view;
          const line = state.doc.lineAt(state.selection.main.head);
          const blank = this.view.hasFocus && line.text.trim() === '' && !state.facet(treeFacet).find(line.from);
          const coords = blank ? this.view.coordsAtPos(line.from) : null;
          if (!coords) {
            this.button.style.display = 'none';
            return;
          }

          const { x } = this.view.contentDOM.getBoundingClientRect();
          this.button.style.top = `${(coords.top + coords.bottom) / 2}px`;
          this.button.style.left = `${x - GUTTER_WIDTH / 2}px`;
          this.button.style.display = 'grid';
        }
      },
    ),

    EditorView.theme({
      // Pinned like the grip: `left`/`top` name the centre point and the transform centres the box.
      '.cm-outliner-add': {
        position: 'fixed',
        zIndex: '5',
        transform: 'translate(-50%, -50%)',
        display: 'grid',
        placeItems: 'center',
        width: 'var(--dx-control)',
        height: 'var(--dx-control)',
      },
      '.cm-outliner-add-icon': {
        display: 'grid',
        placeContent: 'center',
        // `size-3`: the glyph is 1em.
        fontSize: '0.75rem',
        color: 'var(--color-description, currentColor)',
      },
    }),
  ];
};
