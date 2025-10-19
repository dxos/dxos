//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type CleanupFn, addEventListener } from '@dxos/async';

export type MenuOptions = {
  icon?: string;
  height?: number;
  padding?: number;
};

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

        {
          const icon = document.createElement('dx-icon');
          icon.setAttribute('icon', options.icon ?? 'ph--dots-three-vertical--regular');

          this.tag = document.createElement('dx-anchor');
          this.tag.classList.add('cm-popover-trigger');
          this.tag.appendChild(icon);
        }

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
          return;
        }

        const lineHeight = coords.bottom - coords.top;
        const dy = (lineHeight - (options.height ?? 32)) / 2;

        const offsetTop = coords.top + dy;
        const offsetLeft = x + width + (options.padding ?? 8);

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

  EditorView.theme({
    '.cm-popover-trigger': {
      position: 'fixed',
      padding: '0',
      border: 'none',
      opacity: '0',
      display: 'grid',
      placeContent: 'center',
      width: '2rem',
      height: '2rem',
    },
    '&:focus-within .cm-popover-trigger': {
      opacity: '1',
    },
  }),
];
