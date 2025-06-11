//
// Copyright 2024 DXOS.org
//

import { type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { closeEffect, openCommand, openEffect } from './action';
import { type RenderCallback } from '../../types';

export type FloatingMenuOptions = {
  height: number;
  renderMenu: RenderCallback<{ onAction: () => void }>;
};

// TODO(burdon): Trigger completion on click.
// TODO(burdon): Hide when dialog is open.
export const floatingMenu = (options: FloatingMenuOptions) =>
  ViewPlugin.fromClass(
    class {
      button: HTMLElement;
      view: EditorView;
      rafId: number | null = null;

      constructor(view: EditorView) {
        this.view = view;

        // Position context: scrollDOM
        const container = view.scrollDOM;
        if (getComputedStyle(container).position === 'static') {
          container.style.position = 'relative';
        }

        // Render menu externally.
        this.button = document.createElement('div');
        this.button.style.position = 'absolute';
        this.button.style.zIndex = '10';
        this.button.style.display = 'none';

        options.renderMenu(this.button, { onAction: () => openCommand(view) }, view);
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

      scheduleUpdate() {
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }

        this.rafId = requestAnimationFrame(this.updateButtonPosition.bind(this));
      }

      updateButtonPosition() {
        const pos = this.view.state.selection.main.head;
        const { from, height } = this.view.lineBlockAt(pos);
        const { node: el } = this.view.domAtPos(from);

        // Find nearest HTMLElement for the line block.
        let node = el;
        while (node && !(node instanceof HTMLElement) && node.parentNode) {
          node = node.parentNode;
        }

        if (!node) {
          this.button.style.display = 'none';
          return;
        }

        const lineRect = (node as HTMLElement).getBoundingClientRect();
        const containerRect = this.view.scrollDOM.getBoundingClientRect();

        const dy = (options.height - height) / 2;

        // Account for scroll and padding/margin in scrollDOM.
        const offsetTop = lineRect.top - containerRect.top + this.view.scrollDOM.scrollTop - dy;
        const offsetLeft = this.view.scrollDOM.clientWidth + this.view.scrollDOM.scrollLeft - lineRect.x;

        // TODO(burdon): Position is incorrect if cursor is in fenced code block.
        // console.log('offsetTop', lineRect, containerRect);

        this.button.style.top = `${offsetTop}px`;
        this.button.style.left = `${offsetLeft}px`;
        this.button.style.display = 'block';
      }

      destroy() {
        this.button.remove();
        if (this.rafId != null) {
          cancelAnimationFrame(this.rafId);
        }
      }
    },
  );
