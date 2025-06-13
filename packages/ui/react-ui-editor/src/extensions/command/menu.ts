//
// Copyright 2024 DXOS.org
//

import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

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
        button.classList.add('grid', 'items-center', 'justify-center', 'w-8', 'h-8');

        // TODO(burdon): Custom tag/styles?
        this.tag = document.createElement('dx-ref-tag');
        this.tag.classList.add('border-none', 'fixed', 'p-0');
        this.tag.appendChild(button);
        container.appendChild(this.tag);

        // Listen for scroll events.
        container.addEventListener('scroll', this.scheduleUpdate.bind(this));
        this.scheduleUpdate();
      }

      update(update: ViewUpdate) {
        // TODO(burdon): Timer to fade in/out.
        if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(openEffect)))) {
          this.tag.style.display = 'none';
        } else if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(closeEffect)))) {
          this.tag.style.display = 'block';
        } else if (update.selectionSet || update.viewportChanged || update.docChanged || update.geometryChanged) {
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
];
