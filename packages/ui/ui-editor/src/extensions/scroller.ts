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

        requestAnimationFrame(() => {
          this.view.scrollDOM.scrollTo({ top: targetScrollTop, behavior });
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
 * Each animation frame the step is:
 *   step = clamp(|delta| * k, minStep, maxStep)  -- but never more than |delta|
 *
 * Capping at |delta| is critical: it prevents overshoot, which would otherwise cause
 * oscillation when the proportional step (or minStep) exceeds the remaining distance.
 * The crawler settles exactly at the target with no bounce.
 *
 * @param k Fraction of remaining distance moved each frame (0 < k < 1).
 * @param minStep Min step size in px; prevents stalling on large distances.
 * @param maxStep Max step size in px.
 * @param targetDelta Snap-to-target threshold in px.
 */
export function createCrawler(view: EditorView, k = 0.3, maxStep = 2, targetDelta = 0.5) {
  const el = view.scrollDOM;

  let currentTop = 0; // Float-precision position; avoids browser integer-rounding of scrollTop.
  let rafId: number | null = null;

  function frame() {
    // Recompute each frame so the animation chases a live-updating document's bottom.
    const targetTop = el.scrollHeight - el.clientHeight;
    const delta = targetTop - currentTop;
    const absDelta = Math.abs(delta);
    if (absDelta < targetDelta) {
      el.scrollTop = targetTop;
      currentTop = targetTop;
      rafId = null;
      return;
    }

    // Clamp step to [minStep, maxStep], then cap at absDelta to prevent overshoot.
    const step = Math.sign(delta) * Math.min(absDelta, Math.max(1, Math.min(absDelta * k, maxStep)));
    currentTop += step;
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
      }
    },
  };
}
