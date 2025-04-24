//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type BlockInfo, EditorView, keymap, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { log } from '@dxos/log';

import { hintViewPlugin } from './hint';
import { closeEffect, commandConfig, commandKeyBindings, commandState } from './state';

// TODO(burdon): Create knowledge base for CM notes and ideas.
// https://discuss.codemirror.net/t/inline-code-hints-like-vscode/5533/4
// https://github.com/saminzadeh/codemirror-extension-inline-suggestion
// https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/ui/components/text_editor/config.ts#L370

export type CommandAction = {
  insert?: string;
};

export type CommandOptions = {
  onRender: (el: HTMLElement, cb: (action?: CommandAction) => void) => void;
  onHint: () => string | undefined;
};

export const command = (options: CommandOptions): Extension => {
  return [
    commandConfig.of(options),
    commandState,
    keymap.of(commandKeyBindings),
    floatingButton(options),
    hintViewPlugin(options),
    EditorView.focusChangeEffect.of((_, focusing) => {
      return focusing ? closeEffect.of(null) : null;
    }),
    EditorView.theme({
      '.cm-tooltip': {
        background: 'transparent',
      },
      '.cm-floating-button': {
        border: '1px solid red',
        padding: '8px',
        borderRadius: '4px',
      },
    }),
  ];
};

// TODO(burdon): Trigger completion on click.
// TODO(burdon): Hide when dialog is open.
const floatingButton = (options: CommandOptions) =>
  ViewPlugin.fromClass(
    class {
      button: HTMLElement;
      view: EditorView;
      rafId: number | null = null;

      constructor(view: EditorView) {
        this.view = view;

        // TODO(burdon): Render externally.
        this.button = document.createElement('button');
        this.button.onclick = () => log.info('Floating button clicked!');
        this.button.className = 'cm-floating-button';
        this.button.textContent = '#';
        this.button.style.position = 'absolute';
        this.button.style.zIndex = '10';
        this.button.style.display = 'none';

        // Position context: scrollDOM
        const container = view.scrollDOM;
        if (getComputedStyle(container).position === 'static') {
          container.style.position = 'relative';
        }
        container.appendChild(this.button);

        // Listen for scroll events.
        container.addEventListener('scroll', this.scheduleUpdate);
        this.scheduleUpdate();
      }

      update(update: ViewUpdate) {
        if (update.selectionSet || update.viewportChanged || update.docChanged || update.geometryChanged) {
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
