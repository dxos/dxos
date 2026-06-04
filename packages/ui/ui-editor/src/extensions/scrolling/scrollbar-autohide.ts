//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

export type ScrollbarAutohideOptions = {
  /**
   * Milliseconds of scroll inactivity before the scrollbar fades out again.
   * @default 800
   */
  timeout?: number;
};

/**
 * macOS-style overlay scrollbar: the thumb is hidden until the user scrolls, then fades out after a
 * short idle `timeout`. Opt-in — include it in the editor's extension list. Independent of the
 * default hover behaviour in the base theme (which still reveals the thumb on hover).
 */
export const scrollbarAutohide = ({ timeout = 800 }: ScrollbarAutohideOptions = {}): Extension => [
  ViewPlugin.fromClass(
    class {
      #scroller: HTMLElement;
      #timer?: ReturnType<typeof setTimeout>;

      constructor(view: EditorView) {
        this.#scroller = view.scrollDOM;
        this.#scroller.addEventListener('scroll', this.#handleScroll, { passive: true });
      }

      destroy(): void {
        this.#scroller.removeEventListener('scroll', this.#handleScroll);
        clearTimeout(this.#timer);
      }

      // Show the thumb while scrolling; remove the class once scrolling has been idle for `timeout`.
      readonly #handleScroll = (): void => {
        this.#scroller.classList.add('cm-scrolling');
        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => this.#scroller.classList.remove('cm-scrolling'), timeout);
      };
    },
  ),
  EditorView.theme({
    // Reveal the thumb only while actively scrolling.
    '.cm-scroller.cm-scrolling::-webkit-scrollbar-thumb': {
      background: 'var(--color-scrollbar-thumb)',
    },
    // Suppress the base theme's hover-reveal (higher specificity via `:not(.cm-scrolling)`), so a
    // hovered/focused-but-idle editor keeps the thumb hidden.
    '&:hover .cm-scroller:not(.cm-scrolling)::-webkit-scrollbar-thumb': {
      background: 'transparent',
    },
  }),
];
