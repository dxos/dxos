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
    // NOTE: Uses TS `private`/plain fields rather than ES `#private`. CodeMirror's plugin lifecycle
    // (and the source/prebundled double-load in dev) can invoke `destroy` with a `this` that the
    // WeakMap-based `#private` transpilation rejects ("private field on non-instance"), crashing
    // editor teardown. Plain fields avoid the membership check.
    class {
      private readonly _scroller: HTMLElement;
      private _timer?: ReturnType<typeof setTimeout>;

      constructor(view: EditorView) {
        this._scroller = view.scrollDOM;
        this._scroller.addEventListener('scroll', this._handleScroll, { passive: true });
      }

      destroy(): void {
        this._scroller.removeEventListener('scroll', this._handleScroll);
        clearTimeout(this._timer);
      }

      // Show the thumb while scrolling; remove the class once scrolling has been idle for `timeout`.
      private readonly _handleScroll = (): void => {
        this._scroller.classList.add('cm-scrolling');
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this._scroller.classList.remove('cm-scrolling'), timeout);
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
