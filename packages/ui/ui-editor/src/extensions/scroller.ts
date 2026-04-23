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
        overflowAnchor: 'none',
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
 * @param accel Acceleration in px/frame^2 for ease-in/ease-out.
 * @param maxVelocity Maximum scroll velocity in px/frame.
 * @param snapThreshold Snap-to-target threshold in px.
 */
export function createCrawler(view: EditorView, accel = 0.15, maxVelocity = 1, snapThreshold = 0.5) {
  const el = view.scrollDOM;

  let currentTop = 0;
  let velocity = 0;
  let rafId: number | null = null;

  function frame() {
    const targetTop = el.scrollHeight - el.clientHeight;
    const delta = targetTop - currentTop;
    const absDelta = Math.abs(delta);

    if (absDelta < snapThreshold && Math.abs(velocity) < snapThreshold) {
      el.scrollTop = targetTop;
      currentTop = targetTop;
      velocity = 0;
      rafId = null;
      return;
    }

    // Stopping distance at current velocity: v^2 / (2 * accel).
    const stoppingDistance = (velocity * velocity) / (2 * accel);
    const direction = Math.sign(delta);

    if (velocity !== 0 && (absDelta <= stoppingDistance || direction !== Math.sign(velocity))) {
      // Decelerate: close enough to target or moving the wrong way.
      velocity -= Math.sign(velocity) * Math.min(accel, Math.abs(velocity));
    } else {
      // Accelerate toward target, capped at maxVelocity.
      velocity += direction * accel;
      velocity = Math.sign(velocity) * Math.min(Math.abs(velocity), maxVelocity);
    }

    currentTop += velocity;
    el.scrollTop = currentTop;
    rafId = requestAnimationFrame(frame);
  }

  return {
    scroll: () => {
      if (rafId === null) {
        currentTop = el.scrollTop;
        rafId = requestAnimationFrame(frame);
      }
    },
    cancel: () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        velocity = 0;
      }
    },
  };
}
