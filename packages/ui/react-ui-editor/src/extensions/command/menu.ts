//
// Copyright 2024 DXOS.org
//

import { type BlockInfo, type EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type CommandOptions } from './command';
import { closeEffect, openCommand, openEffect } from './state';

// TODO(burdon): Trigger completion on click.
// TODO(burdon): Hide when dialog is open.
export const floatingMenu = (options: CommandOptions) =>
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

        options.onRenderMenu(this.button, () => {
          openCommand(view);
        });
        container.appendChild(this.button);

        // Listen for scroll events.
        container.addEventListener('scroll', this.scheduleUpdate);
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
        this.rafId = requestAnimationFrame(() => this.updateButtonPosition());
      }

      updateButtonPosition() {
        const pos = this.view.state.selection.main.head;
        const lineBlock: BlockInfo = this.view.lineBlockAt(pos);
        const domInfo = this.view.domAtPos(lineBlock.from);

        // Find nearest HTMLElement for the line block
        let node: Node | null = domInfo.node;
        while (node && !(node instanceof HTMLElement)) {
          node = node.parentNode;
        }

        if (!node) {
          this.button.style.display = 'none';
          return;
        }

        const lineRect = (node as HTMLElement).getBoundingClientRect();
        const containerRect = this.view.scrollDOM.getBoundingClientRect();

        // Account for scroll and padding/margin in scrollDOM.
        const offsetTop = lineRect.top - containerRect.top + this.view.scrollDOM.scrollTop;
        const offsetLeft = this.view.scrollDOM.clientWidth + this.view.scrollDOM.scrollLeft - lineRect.x;

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
