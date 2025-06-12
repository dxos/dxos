//
// Copyright 2024 DXOS.org
//

import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { closeEffect, openEffect } from './action';
import { type RenderCallback } from '../../types';

export type FloatingMenuOptions = {
  height?: number;
  renderMenu: RenderCallback<{ onAction: () => void }>;
};

export const floatingMenu = (options: FloatingMenuOptions) =>
  ViewPlugin.fromClass(
    class {
      view: EditorView;
      button: HTMLElement;
      rafId: number | null = null;

      constructor(view: EditorView) {
        this.view = view;

        // Position context.
        const container = view.scrollDOM;
        if (getComputedStyle(container).position === 'static') {
          container.style.position = 'relative';
        }

        // Render menu externally.
        // this.button = document.createElement('div'); // TODO(burdon) ref-tag.
        // this.button.style.position = 'absolute';
        // this.button.style.zIndex = '10';
        // this.button.style.display = 'none';

        this.button = document.createElement('dx-ref-tag');
        const icon = document.createElement('dx-icon');
        icon.setAttribute('icon', 'ph--x--regular');
        this.button.appendChild(icon);

        // options.renderMenu(this.button, { onAction: () => openCommand(view) }, view);
        container.appendChild(this.button);

        // Listen for scroll events.
        container.addEventListener('scroll', this.scheduleUpdate.bind(this));
        this.scheduleUpdate();
      }

      update(update: ViewUpdate) {
        // TODO(burdon): Timer to fade in/out.
        if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(openEffect)))) {
          this.button.style.display = 'none';
        } else if (update.transactions.some((tr) => tr.effects.some((effect) => effect.is(closeEffect)))) {
          this.button.style.display = 'block';
        } else if (update.selectionSet || update.viewportChanged || update.docChanged || update.geometryChanged) {
          this.scheduleUpdate();
        }
      }

      updateButtonPosition() {
        const pos = this.view.state.selection.main.head;
        const line = this.view.lineBlockAt(pos);

        const scrollRect = this.view.scrollDOM.getBoundingClientRect();
        const contentRect = this.view.contentDOM.getBoundingClientRect();

        // Center the menu.
        const dy = options.height ? (line.height - options.height) / 2 : 0;

        const offsetTop = scrollRect.top + line.top + dy;
        const offsetLeft = scrollRect.width - contentRect.x;

        this.button.style.top = `${offsetTop}px`;
        this.button.style.left = `${offsetLeft}px`;
        this.button.style.display = 'block';

        // TODO(burdon): Position is incorrect if cursor is in fenced code block.
        // console.log('offsetTop', lineRect, containerRect);
      }

      scheduleUpdate() {
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(this.updateButtonPosition.bind(this));
      }

      destroy() {
        this.button.remove();
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }
      }
    },
  );
