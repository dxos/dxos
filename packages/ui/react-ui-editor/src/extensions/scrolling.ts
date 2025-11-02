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
   * Duration of the scroll animation in milliseconds.
   * @default 500
   */
  duration?: number;
  /**
   * CSS easing function for the animation.
   * @default 'ease-in-out'
   */
  easing?: string;
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
 * // Add to editor extensions
 * const extensions = [
 *   smoothScroll({ duration: 800, easing: 'ease-out' })
 * ];
 *
 * // Trigger scroll to line 42
 * view.dispatch({
 *   effects: scrollToLineEffect.of({ line: 42 })
 * });
 *
 * // Scroll with custom options
 * view.dispatch({
 *   effects: scrollToLineEffect.of({
 *     line: 100,
 *     options: { duration: 1000, offset: -50 }
 *   })
 * });
 *
 * // Scroll so line appears at end (bottom) of screen
 * view.dispatch({
 *   effects: scrollToLineEffect.of({
 *     line: 50,
 *     options: { position: 'end' }
 *   })
 * });
 * ```
 */
export const smoothScroll = ({
  duration = 500,
  easing = 'ease-in-out',
  offset = 0,
  position = 'start',
}: Partial<SmoothScrollOptions> = {}) => {
  // ViewPlugin to manage scroll animations.
  const scrollPlugin = ViewPlugin.fromClass(
    class SmoothScrollPlugin {
      private animationId: number | null = null;

      constructor(private view: EditorView) {}

      destroy() {
        this.cancelActiveAnimation();
      }

      /**
       * Cancel any currently running scroll animation.
       */
      private cancelActiveAnimation() {
        if (this.animationId !== null) {
          cancelAnimationFrame(this.animationId);
          this.animationId = null;
        }
      }

      /**
       * Perform smooth scroll to the specified line.
       */
      scrollToLine(lineNumber: number, options: SmoothScrollOptions) {
        this.cancelActiveAnimation();

        const { duration: animDuration, easing: animEasing, offset: animOffset, position: animPosition } = options;
        const scroller = this.view.scrollDOM;

        // Convert 1-based line number to 0-based.
        const targetLine = Math.max(0, lineNumber - 1);

        // Get the position of the target line.
        const doc = this.view.state.doc;
        if (targetLine >= doc.lines) {
          // Line doesn't exist, scroll to end.
          const targetScrollTop = scroller.scrollHeight - scroller.clientHeight + (animOffset || 0);
          this.animateScroll(scroller, targetScrollTop, animDuration || 500, animEasing || 'ease-in-out');
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
        let targetScrollTop: number;

        if (animPosition === 'end') {
          // Position line at end (bottom) of viewport.
          targetScrollTop = currentScrollTop + coords.top - scrollerRect.bottom + coords.bottom - coords.top + (animOffset || 0);
        } else {
          // Default: position line at start (top) of viewport.
          targetScrollTop = currentScrollTop + coords.top - scrollerRect.top + (animOffset || 0);
        }

        // Clamp to valid scroll range.
        const maxScrollTop = scroller.scrollHeight - scroller.clientHeight;
        const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

        this.animateScroll(scroller, clampedScrollTop, animDuration || 500, animEasing || 'ease-in-out');
      }

      /**
       * Animate scroll using requestAnimationFrame with easing.
       */
      private animateScroll(element: HTMLElement, targetScrollTop: number, duration: number, easingName: string) {
        const startScrollTop = element.scrollTop;
        const distance = targetScrollTop - startScrollTop;

        if (Math.abs(distance) < 1) {
          // Already at target position
          return;
        }

        const startTime = performance.now();
        const easingFunction = this.getEasingFunction(easingName);

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const easedProgress = easingFunction(progress);
          const currentScrollTop = startScrollTop + distance * easedProgress;

          element.scrollTop = currentScrollTop;

          if (progress < 1) {
            this.animationId = requestAnimationFrame(animate);
          } else {
            this.animationId = null;
          }
        };

        this.animationId = requestAnimationFrame(animate);
      }

      /**
       * Get easing function by name.
       */
      private getEasingFunction(name: string): (t: number) => number {
        switch (name) {
          case 'linear':
            return (t) => t;
          case 'ease-in':
            return (t) => t * t;
          case 'ease-out':
            return (t) => t * (2 - t);
          case 'ease-in-out':
          default:
            return (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
        }
      }
    },
  );

  return [
    scrollPlugin,

    // Update listener to handle scroll effects
    EditorView.updateListener.of((update) => {
      update.transactions.forEach((transaction) => {
        for (const effect of transaction.effects) {
          if (effect.is(scrollToLineEffect)) {
            const { line, options = {} } = effect.value;
            const effectiveOptions = {
              duration,
              easing,
              offset,
              position,
              ...options,
            };

            // Get the plugin instance and call scrollToLine.
            const plugin = update.view.plugin(scrollPlugin);
            if (plugin) {
              plugin.scrollToLine(line, effectiveOptions);
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
