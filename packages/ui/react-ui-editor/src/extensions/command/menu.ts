//
// Copyright 2024 DXOS.org
//

import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { closeEffect, openEffect } from './action';

export type FloatingMenuOptions = {
  icon?: string;
  height?: number;
  padding?: number;
};

export const floatingMenu = (options: FloatingMenuOptions = {}) => [
  ViewPlugin.fromClass(
    class {
      view: EditorView;
      tag: HTMLElement;
      rafId: number | null = null;

      constructor(view: EditorView) {
        this.view = view;

        // Position context.
        const container = view.scrollDOM;
        if (getComputedStyle(container).position === 'static') {
          container.style.position = 'relative';
        }

        const icon = document.createElement('dx-icon');
        icon.setAttribute('icon', options.icon ?? 'ph--dots-three-outline--regular');

        const button = document.createElement('button');
        button.appendChild(icon);

        // TODO(burdon): Custom tag/styles?
        this.tag = document.createElement('dx-ref-tag');
        this.tag.classList.add('cm-ref-tag');
        this.tag.appendChild(button);
        container.appendChild(this.tag);

        // Listen for scroll events.
        container.addEventListener('scroll', this.scheduleUpdate.bind(this));
        this.scheduleUpdate();
      }

      update(update: ViewUpdate) {
        this.tag.dataset.focused = update.view.hasFocus ? 'true' : 'false';
        if (!update.view.hasFocus) {
          return;
        }

        // TODO(burdon): Timer to fade in/out.
        if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(openEffect)))) {
          this.tag.style.display = 'none';
          this.tag.classList.add('opacity-10');
        } else if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(closeEffect)))) {
          this.tag.style.display = 'block';
        } else if (
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
        this.tag.style.display = 'block';
      }

      scheduleUpdate() {
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(this.updateButtonPosition.bind(this));
      }

      destroy() {
        this.tag.remove();
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }
      }
    },
  ),

  EditorView.theme({
    '.cm-ref-tag': {
      position: 'fixed',
      padding: '0',
      border: 'none',
      transition: 'opacity 0.3s ease-in-out',
      opacity: 0.1,
    },
    '.cm-ref-tag button': {
      display: 'grid',
      alignItems: 'center',
      justifyContent: 'center',
      width: '2rem',
      height: '2rem',
    },
    '.cm-ref-tag[data-focused="true"]': {
      opacity: 1,
    },
  }),
];
