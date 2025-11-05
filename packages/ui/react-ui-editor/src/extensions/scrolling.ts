//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

/**
 * Configuration options for smooth scrolling behavior.
 */
export type SmoothScrollOptions = {
  /**
   * Additional offset from the target line in pixels.
   * Positive values scroll past the line, negative values stop before it.
   * @default 0
   */
  offset?: number;
  /**
   * Position of the target line in the viewport.
   * - 'start': Line appears at the start (top) of the screen
   * - 'end': Line appears at the end (bottom) of the screen
   * @default 'start'
   */
  position?: 'start' | 'end';
  /**
   * Whether to use smooth scrolling.
   * @default 'smooth'
   */
  behavior?: ScrollBehavior;
};

/**
 * Parameters for the scroll to line effect.
 */
export type ScrollToLineParams = {
  /**
   * The line number to scroll to (1-based).
   */
  line: number;
  /**
   * Optional configuration to override default scroll behavior.
   */
  options?: SmoothScrollOptions;
};

/**
 * StateEffect for triggering smooth scroll to a specific line.
 */
export const scrollToLineEffect = StateEffect.define<ScrollToLineParams>();

/**
 * Extension that provides smooth scrolling to specific lines in the editor.
 *
 * @example
 * ```typescript
 * // Add to editor extensions.
 * const extensions = [
 *   smoothScroll()
 * ];
 *
 * // Trigger scroll to line 42.
 * view.dispatch({
 *   effects: scrollToLineEffect.of({ line: 42 })
 * });
 *
 * // Scroll with custom options.
 * view.dispatch({
 *   effects: scrollToLineEffect.of({ line: 100, options: { offset: -50 } })
 * });
 *
 * // Scroll so line appears at end (bottom) of screen.
 * view.dispatch({
 *   effects: scrollToLineEffect.of({ line: 50, options: { position: 'end' } })
 * });
 * ```
 */
export const smoothScroll = ({ offset = 0, position = 'start' }: Partial<SmoothScrollOptions> = {}) => {
  // ViewPlugin to manage scroll animations.
  const scrollPlugin = ViewPlugin.fromClass(
    class SmoothScrollPlugin {
      constructor(private readonly view: EditorView) {}

      // No-op.
      destroy() {}

      /**
       * Perform smooth scroll to the specified line.
       */
      scrollToLine(lineNumber: number, options: SmoothScrollOptions) {
        const { offset: animOffset = 0, position: animPosition, behavior } = options;
        const doc = this.view.state.doc;
        const scroller = this.view.scrollDOM;

        // Convert 1-based line number to 0-based.
        const targetLine = Math.max(0, lineNumber - 1);
        if (behavior === 'instant') {
          requestAnimationFrame(() => {
            this.view.dispatch({
              selection: { anchor: doc.line(targetLine + 1).from },
              scrollIntoView: true,
            });
          });
          return;
        }

        // Get the position of the target line.
        if (targetLine >= doc.lines) {
          // Line doesn't exist, scroll to end.
          const targetScrollTop = scroller.scrollHeight - scroller.clientHeight + (animOffset || 0);
          this.animateScroll(scroller, targetScrollTop);
          return;
        }

        const lineStart = doc.line(targetLine + 1).from;
        const coords = this.view.coordsAtPos(lineStart);
        if (!coords) {
          return;
        }

        // Calculate target scroll position based on position option.
        const currentScrollTop = scroller.scrollTop;
        const scrollerRect = scroller.getBoundingClientRect();
        const maxScrollTop = scroller.scrollHeight - scroller.clientHeight;

        let targetScrollTop: number;
        if (animPosition === 'end') {
          // Position line at end (bottom) of viewport.
          // Calculate how far down we need to scroll so the line's bottom aligns with viewport bottom.
          targetScrollTop = currentScrollTop + coords.bottom - scrollerRect.bottom + animOffset;
        } else {
          // Default: position line at start (top) of viewport.
          targetScrollTop = currentScrollTop + coords.top - scrollerRect.top + animOffset;
        }

        // Clamp to valid scroll range.
        const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
        this.animateScroll(scroller, clampedScrollTop);
      }

      /**
       * Animate scroll using browser's built-in smooth scrolling.
       */
      private animateScroll(element: HTMLElement, targetScrollTop: number) {
        if (Math.abs(targetScrollTop - element.scrollTop) < 1) {
          return;
        }

        // Use browser's built-in smooth scrolling.
        element.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth',
        });
      }
    },
  );

  return [
    scrollPlugin,

    // Update listener to handle scroll effects.
    EditorView.updateListener.of((update) => {
      update.transactions.forEach((transaction) => {
        for (const effect of transaction.effects) {
          if (effect.is(scrollToLineEffect)) {
            const { line, options = {} } = effect.value;
            const plugin = update.view.plugin(scrollPlugin);
            if (plugin) {
              plugin.scrollToLine(line, { offset, position, ...options });
            }
          }
        }
      });
    }),
  ];
};

/**
 * Helper function to scroll to a specific line.
 * This is a convenience function that can be used directly with an EditorView.
 *
 * @param view - The CodeMirror EditorView instance
 * @param line - The line number to scroll to (1-based)
 * @param options - Optional scroll configuration
 */
export const scrollToLine = (view: EditorView, line: number, options?: SmoothScrollOptions) => {
  view.dispatch({
    effects: scrollToLineEffect.of({ line, options }),
  });
};
