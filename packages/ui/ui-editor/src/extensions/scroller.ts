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
      '.cm-scroller': {
        overflowY: 'scroll',
        // Browser scroll-anchoring: when widgets above the viewport resize (e.g. tool blocks
        // expanding their TogglePanel), the browser picks a stable element near the viewport
        // top and adjusts `scrollTop` so the user's view doesn't jump. Auto-scroll's pinning
        // logic still has the final word when pinned (forces scrollTop to scrollHeight).
        overflowAnchor: 'auto',
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
      // Spacer below the last text line. Implemented as a real block pseudo-element
      // (rather than `padding-bottom` on `.cm-content`) so it materializes in the
      // scroller's `scrollHeight` regardless of how `padding` is reset by the base
      // theme or downstream classes — this is what gives auto-scroll its head-room
      // so the last line stays `overScroll` px above the viewport bottom.
      '.cm-content::after': {
        content: '""',
        display: 'block',
        height: `${overScroll}px`,
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
 * Uses a critically-damped spring: each frame applies a restoring force toward the
 * target and a damping force opposing current velocity. With damping = 2·ω, the
 * system is critically damped — fastest approach without overshoot. The spring
 * naturally sprints when far behind and eases as it approaches, so streaming
 * content is followed tightly without the jerk of explicit accel/decel state.
 *
 * Integration uses real elapsed wall-clock time so the perceived speed stays
 * constant when requestAnimationFrame is throttled (e.g. low-power mode dropping
 * from 60Hz to 30Hz).
 *
 * @param omega Spring stiffness in rad/s. Higher = snappier follow. ~12–18 feels good.
 * @param snapThreshold Snap-to-target distance threshold in px.
 * @param snapVelocity Snap-to-target velocity threshold in px/s.
 */
export function createCrawler(view: EditorView, omega = 5, snapThreshold = 5, snapVelocity = 50) {
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
    if (Math.abs(delta) < snapThreshold && Math.abs(velocity) < snapVelocity) {
      el.scrollTop = targetTop;
      currentTop = targetTop;
      velocity = 0;
      rafId = null;
      lastTime = 0;
      return;
    }

    // Critically-damped spring: a = ω²·delta − 2ω·v.
    const accel = omega * omega * delta - 2 * omega * velocity;
    velocity += accel * dt;
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
