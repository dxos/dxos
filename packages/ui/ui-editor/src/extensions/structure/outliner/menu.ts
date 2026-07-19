//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type CleanupFn, addEventListener } from '@dxos/async';
import { Domino } from '@dxos/ui';

// Right-hand strip (px) mirroring the drag grip's left strip; the trigger is centered within it. 3rem.
const GUTTER = 48;

// Square trigger size (px), matching the drag grip (`dx-button` density `xs` + `aspect-square` → `size-6`).
const TRIGGER_SIZE = 24;

export type MenuOptions = {
  icon?: string;
  height?: number;
  padding?: number;
};

/** Floating action button positioned beside the active outliner line. */
// TODO(burdon): Replace with popover.
export const menu = (options: MenuOptions = {}): Extension => [
  ViewPlugin.fromClass(
    class {
      view: EditorView;
      tag: HTMLElement;
      rafId?: number | null;
      cleanup?: CleanupFn;

      constructor(view: EditorView) {
        this.view = view;

        // Position context.
        const container = view.scrollDOM;
        if (getComputedStyle(container).position === 'static') {
          container.style.position = 'relative';
        }

        // Outer `dx-anchor` (fires `dx-anchor-activate`, driving the popover) styled as a `dx-button`;
        // inner element holds the phosphor glyph. Mirrors the drag grip's construction.
        this.tag = Domino.of('dx-anchor')
          .classNames('dx-button aspect-square cm-popover-trigger')
          .attributes({ 'data-variant': 'ghost', 'data-density': 'xs' })
          .append(
            Domino.of('div')
              .classNames('cm-popover-trigger-icon')
              .append(Domino.svg(options.icon ?? 'ph--dots-three-vertical--regular')),
          ).root;

        container.appendChild(this.tag);

        // Listen for scroll events.
        const handler = () => this.scheduleUpdate();
        this.cleanup = addEventListener(container, 'scroll', handler);
        this.scheduleUpdate();
      }

      destroy() {
        this.cleanup?.();
        this.tag.remove();
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }
      }

      update(update: ViewUpdate) {
        this.tag.dataset.focused = update.view.hasFocus ? 'true' : 'false';
        if (!update.view.hasFocus) {
          return;
        }

        // TODO(burdon): Timer to fade in/out.
        /*if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(openEffect)))) {
          this.tag.style.display = 'none';
          this.tag.classList.add('opacity-10');
        } else if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(closeEffect)))) {
          this.tag.style.display = '';
        } else */ if (
          update.docChanged ||
          update.focusChanged ||
          update.geometryChanged ||
          update.selectionSet ||
          update.viewportChanged
        ) {
          this.scheduleUpdate();
        }
      }

      updateButtonPosition() {
        const { x, width } = this.view.contentDOM.getBoundingClientRect();

        const pos = this.view.state.selection.main.head;
        const line = this.view.lineBlockAt(pos);
        const coords = this.view.coordsAtPos(line.from);
        if (!coords) {
          // No resolvable line (e.g. the caret's item was just deleted): hide rather than leave the
          // trigger stranded at its previous position.
          this.tag.style.display = 'none';
          return;
        }

        const lineHeight = coords.bottom - coords.top;
        const dy = (lineHeight - (options.height ?? TRIGGER_SIZE)) / 2;

        const offsetTop = coords.top + dy;
        // Center the trigger within the 3rem gutter immediately right of the content (mirrors the grip).
        const offsetLeft = x + width + GUTTER / 2 - TRIGGER_SIZE / 2;

        this.tag.style.top = `${offsetTop}px`;
        this.tag.style.left = `${offsetLeft}px`;
        this.tag.style.display = '';
      }

      scheduleUpdate() {
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(this.updateButtonPosition.bind(this));
      }
    },
  ),

  styles,
];

const styles = EditorView.theme({
  // `dx-button` owns the box (size, hover); this only pins it and gates visibility on editor focus.
  '.cm-popover-trigger': {
    position: 'fixed',
    opacity: '0',
    cursor: 'pointer',
  },
  '.cm-popover-trigger-icon': {
    display: 'grid',
    placeContent: 'center',
    fontSize: '16px',
    color: 'var(--color-description, currentColor)',
  },
  '&:focus-within .cm-popover-trigger': {
    opacity: '1',
  },
  // Hide the trigger while a block drag is in flight (the scroller carries `cm-blockDragging`).
  '.cm-scroller.cm-blockDragging .cm-popover-trigger': {
    opacity: '0 !important',
    pointerEvents: 'none',
  },
});
