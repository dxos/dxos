//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { log } from '@dxos/log';

/**
 * Parameters for the scroll to line effect.
 */
export type ScrollToProps = {
  /**
   * Zero-based line number; -1 for end of document.
   * NOTE: view.state.doc.lineAt() uses 1-based line numbers.
   */
  line: number;

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
   * @default 'instant'
   */
  behavior?: ScrollBehavior;
};

/** Scroll to a specific line. */
export const scrollerLineEffect = StateEffect.define<ScrollToProps>();

/** Start/stop crawling the end of the document. */
export const scrollerCrawlEffect = StateEffect.define<boolean>();

/**
 * Helper function to scroll to a specific line.
 * This is a convenience function that can be used directly with an EditorView.
 */
export const scrollToLine = (view: EditorView, options: ScrollToProps) => {
  view.dispatch({
    effects: scrollerLineEffect.of(options),
  });
};

export type ScrollerOptions = {
  /** Threshold in px to trigger scroll from bottom. */
  overScroll?: number;
};

/**
 * Extension that provides smooth scrolling to specific lines in the editor.
 */
export const scroller = ({ overScroll = 0 }: ScrollerOptions = {}) => {
  // ViewPlugin to manage scroll animations.
  const scrollPlugin = ViewPlugin.fromClass(
    class ScrollerPlugin {
      private readonly crawler: ReturnType<typeof createCrawler>;
      constructor(private readonly view: EditorView) {
        this.crawler = createCrawler(this.view);
      }

      // No-op.
      destroy() {
        this.crawler.cancel();
      }

      cancel() {
        this.crawler.cancel();
      }

      crawl(start = false) {
        if (start) {
          this.crawler.scroll();
        } else {
          this.crawler.cancel();
        }
      }

      scroll({ line, offset = 0, position, behavior = 'instant' }: ScrollToProps) {
        const { scrollTop, scrollHeight, clientHeight } = this.view.scrollDOM;
        const scrollerRect = this.view.scrollDOM.getBoundingClientRect();
        const doc = this.view.state.doc;

        let targetScrollTop = scrollHeight - clientHeight + offset;
        if (line >= 0 && line <= doc.lines - 1) {
          const lineStart = doc.line(line + 1).from;
          const coords = this.view.coordsAtPos(lineStart);
          if (coords) {
            // Calculate target scroll position based on position option.
            const currentScrollTop = scrollTop;
            const maxScrollTop = scrollHeight - clientHeight;

            if (position === 'end') {
              // Position line at end (bottom) of viewport.
              // Calculate how far down we need to scroll so the line's bottom aligns with viewport bottom.
              targetScrollTop = currentScrollTop + coords.bottom - scrollerRect.bottom + offset;
            } else {
              // Default: position line at start (top) of viewport.
              targetScrollTop = currentScrollTop + coords.top - scrollerRect.top + offset;
            }

            // Clamp to valid scroll range.
            targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
          }
        }

        // TODO(burdon): Smooth scrolling doesn't work when the document is being streamed into.
        requestAnimationFrame(() => {
          this.view.scrollDOM.scrollTo({ top: targetScrollTop }); //, behavior });
        });
      }
    },
  );

  return [
    scrollPlugin,

    // Listen for effect.s
    EditorView.updateListener.of((update) => {
      update.transactions.forEach((transaction) => {
        try {
          const plugin = update.view.plugin(scrollPlugin);
          if (plugin) {
            for (const effect of transaction.effects) {
              if (effect.is(scrollerCrawlEffect)) {
                plugin.crawl(effect.value);
              } else if (effect.is(scrollerLineEffect)) {
                plugin.scroll(effect.value);
              }
            }
          }
        } catch (err) {
          log.catch(err);
        }
      });
    }),

    // Styles.
    EditorView.theme({
      '.cm-content': {
        paddingBottom: `${overScroll}px`,
      },
      '.cm-scroller': {
        overflowY: 'scroll',
        // Browser scroll-anchoring: when widgets above the viewport resize (e.g. tool blocks
        // expanding their TogglePanel), the browser picks a stable element near the viewport
        // top and adjusts `scrollTop` so the user's view doesn't jump. Auto-scroll's pinning
        // logic still has the final word when pinned (forces scrollTop to scrollHeight).
        overflowAnchor: 'auto',
        paddingBottom: '0',
      },
      '.cm-scroller.cm-hide-scrollbar::-webkit-scrollbar': {
        display: 'none',
      },
      '.cm-scroller::-webkit-scrollbar-thumb': {
        background: 'transparent',
        transition: 'background 0.15s',
      },
      '&:hover .cm-scroller::-webkit-scrollbar-thumb': {
        background: 'var(--color-scrollbar-thumb)',
      },
      '.cm-scroll-button': {
        position: 'absolute',
        bottom: '0.5rem',
        right: '1rem',
      },
    }),
  ];
};

/**
 * Creates a smooth crawler that follows the live bottom of a CodeMirror 6 EditorView.
 *
 * Uses a velocity-based approach with easing:
 * - Accelerates smoothly when content starts arriving.
 * - Maintains a steady cruise velocity during continuous streaming.
 * - Decelerates smoothly when content stops arriving.
 *
 * Velocity is normalized to pixels/second (rather than px/frame) so that the perceived
 * scroll speed stays constant when the browser throttles requestAnimationFrame — for
 * example on low-power/low-battery modes where the refresh rate drops from 60Hz to 30Hz
 * or lower. Each frame integrates over the actual elapsed wall-clock time.
 *
 * @param accel Acceleration in px/s^2 for ease-in/ease-out (defaults to ~0.15 px/frame^2 at 60Hz).
 * @param maxVelocity Maximum scroll velocity in px/s (defaults to ~1 px/frame at 60Hz).
 * @param snapVelocity Snap-to-target velocity threshold in px/s.
 * @param snapThreshold Snap-to-target distance threshold in px.
 */
export function createCrawler(
  view: EditorView,
  accel = 300,
  maxVelocity = 800,
  snapVelocity = 200,
  snapThreshold = 0.5,
) {
  const el = view.scrollDOM;

  let currentTop = 0;
  let velocity = 0;
  let rafId: number | null = null;
  let lastTime = 0;

  function frame(now: number) {
    // Clamp dt to handle long pauses (tab backgrounded) and the first frame.
    const dt = lastTime === 0 ? 1 / 60 : Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    const targetTop = el.scrollHeight - el.clientHeight;
    const delta = targetTop - currentTop;
    const absDelta = Math.abs(delta);
    if (absDelta < snapThreshold && Math.abs(velocity) < snapVelocity) {
      el.scrollTop = targetTop;
      currentTop = targetTop;
      velocity = 0;
      rafId = null;
      lastTime = 0;
      return;
    }

    // Stopping distance at current velocity: v^2 / (2 * accel) — same formula in any consistent units.
    const stoppingDistance = (velocity * velocity) / (2 * accel);
    const direction = Math.sign(delta);
    const dv = accel * dt;

    if (velocity !== 0 && (absDelta <= stoppingDistance || direction !== Math.sign(velocity))) {
      // Decelerate: close enough to target or moving the wrong way.
      velocity -= Math.sign(velocity) * Math.min(dv, Math.abs(velocity));
    } else {
      // Accelerate toward target, capped at maxVelocity.
      velocity += direction * dv;
      velocity = Math.sign(velocity) * Math.min(Math.abs(velocity), maxVelocity);
    }

    currentTop += velocity * dt;
    el.scrollTop = currentTop;
    rafId = requestAnimationFrame(frame);
  }

  return {
    scroll: () => {
      if (rafId === null) {
        currentTop = el.scrollTop;
        lastTime = 0;
        rafId = requestAnimationFrame(frame);
      }
    },
    cancel: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        velocity = 0;
        lastTime = 0;
        rafId = null;
      }
    },
  };
}
