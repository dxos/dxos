//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { addEventListener, combine, debounceAndThrottle, throttle } from '@dxos/async';
import { Domino } from '@dxos/ui';
import { getSize } from '@dxos/ui-theme';

import { crawlerActiveEffect, crawlerLineEffect } from './crawler';

/** Enable or disable autoscroll. */
export const autoScrollEffect = StateEffect.define<boolean>();

export type AutoScrollProps = {
  /**
   * If true, immediately jump to the bottom and re-pin whenever the size of the
   * document view (the scroll container) changes — e.g. when a sidebar toggles
   * or the window is resized. This avoids the visible "stuck near bottom" gap
   * that otherwise appears because the previous `scrollTop` no longer reaches
   * the new content height.
   * @default true
   */
  scrollOnResize?: boolean;
};

/**
 * Extension that supports pinning the scroll position and automatically scrolls to the bottom when content is added.
 */
export const autoScroll = ({ scrollOnResize = true }: AutoScrollProps = {}) => {
  let buttonContainer: HTMLDivElement | undefined;
  let isPinned = true;
  let jumpPending = false;
  let enabled = true;
  let firstUpdate = true;
  // Latches once the thread streams real content. Until then (initial open of a populated
  // thread, whose height grows only as widgets measure) we snap instantly; afterwards we follow
  // the bottom smoothly — so the first paint jumps to the end, then streaming eases.
  let streamed = false;

  const setPinned = (pinned: boolean) => {
    buttonContainer?.classList.toggle('opacity-0', pinned);
    isPinned = pinned;
  };

  return [
    // Update listener for scrolling when content changes.
    EditorView.updateListener.of((update) => {
      const { view, heightChanged, state, startState } = update;

      // Handle enable/disable effect.
      for (const tr of update.transactions) {
        for (const effect of tr.effects) {
          if (effect.is(autoScrollEffect)) {
            enabled = effect.value;
            if (enabled) {
              setPinned(true);
              view.dispatch({
                effects: crawlerActiveEffect.of({ active: true }),
              });
            } else {
              view.dispatch({
                effects: crawlerActiveEffect.of({ active: false }),
              });
            }
          }
        }
      }

      if (!enabled) {
        return;
      }

      // Jump to bottom instantly when content first appears (either inserted into
      // an empty doc, or present as initialValue when the editor is created).
      if (isPinned && (firstUpdate || startState.doc.length === 0) && state.doc.length > 0) {
        firstUpdate = false;
        jumpPending = true;
        requestAnimationFrame(() => {
          view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight;
          jumpPending = false;
        });
        return;
      }
      firstUpdate = false;

      // Suppress crawl while the initial jump is pending.
      if (jumpPending) {
        return;
      }

      // Maybe scroll if doc changed and pinned.
      // NOTE: Geometry changed is triggered when widgets change height (e.g., toggle tool block).
      if (heightChanged) {
        if (isPinned) {
          // NOTE: Use scroll geometry instead of coordsAtPos to avoid forced layout/scroll side-effects.
          const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
          const delta = scrollHeight - scrollTop - clientHeight;
          if (update.docChanged) {
            streamed = true;
          }
          if (delta > 0) {
            setPinned(true);
            // Before the thread has streamed any real content, height grows only from layout
            // (widgets measuring on open) — snap instantly so we don't animate through the
            // backlog. Once content has streamed, follow the bottom smoothly with the spring,
            // including reflow frames interleaved with token edits. Both keep following until
            // the height stabilizes.
            view.dispatch({ effects: crawlerActiveEffect.of({ active: true, instant: !streamed }) });
          } else if (delta < -1) {
            setPinned(false);
          }
        } else {
          // TODO(burdon): Should re-pin if content shrinks.
          if (state.doc.length === 0) {
            setPinned(true);
          }
        }
      }
    }),

    // Re-pin and jump to bottom when the scroll container itself resizes (e.g. sidebar toggle,
    // window resize). Doc-driven height changes are handled by the updateListener above; this
    // observer covers the case where the viewport changes while the doc length is unchanged.
    scrollOnResize
      ? ViewPlugin.fromClass(
          class {
            private readonly observer: ResizeObserver;
            private firstObservation = true;
            private destroyed = false;
            constructor(view: EditorView) {
              // Throttle so a continuous drag-resize (or a flurry of layout changes) coalesces
              // into a single re-pin per ~50ms instead of dispatching every frame.
              const onResize = throttle(() => {
                if (this.destroyed || !enabled) {
                  return;
                }

                setPinned(true);
                requestAnimationFrame(() => {
                  if (this.destroyed) {
                    return;
                  }

                  view.scrollDOM.scrollTo({ top: view.scrollDOM.scrollHeight, behavior: 'instant' });
                  view.dispatch({ effects: crawlerActiveEffect.of({ active: false }) });
                });
              }, 50);

              this.observer = new ResizeObserver(() => {
                // Skip the initial fire that ResizeObserver emits on `observe()`.
                if (this.firstObservation) {
                  this.firstObservation = false;
                  return;
                }
                onResize();
              });

              this.observer.observe(view.scrollDOM);
            }
            destroy() {
              this.destroyed = true;
              this.observer.disconnect();
            }
          },
        )
      : [],

    // Detect user scroll and unpin (or re-pin if scrolled to the bottom).
    ViewPlugin.fromClass(
      class {
        private readonly cleanup: () => void;
        constructor(view: EditorView) {
          // Re-pin check is throttled so the listener doesn't thrash while scrolling, but
          // unpinning must be immediate — otherwise content arriving during the throttle
          // window re-applies the crawl effect and yanks the viewport back to the bottom.
          // `debounceAndThrottle` (not bare `throttle`) guarantees a trailing call after the
          // gesture stops; a leading-only throttle drops the final at-bottom sample, leaving the
          // scroll-to-bottom button visible even though the viewport settled at the bottom.
          const onUserScroll = debounceAndThrottle(() => {
            requestAnimationFrame(() => {
              const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
              const delta = scrollHeight - scrollTop - clientHeight;
              // Sub-pixel tolerance: fractional scroll positions can leave delta at e.g. 0.5
              // even when the user is visually at the bottom.
              const pinned = Math.abs(delta) <= 1;
              setPinned(pinned);
              if (!pinned) {
                view.dispatch({ effects: crawlerActiveEffect.of({ active: false }) });
              }
            });
          }, 500);

          this.cleanup = createUserScrollDetector(view.scrollDOM, () => {
            if (isPinned) {
              setPinned(false);
              view.dispatch({ effects: crawlerActiveEffect.of({ active: false }) });
            }
            onUserScroll();
          });
        }
        destroy() {
          this.cleanup();
        }
      },
    ),

    // Scroll button.
    ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          const icon = Domino.of('dx-icon' as any)
            .classNames(getSize(4))
            .attributes({ icon: 'ph--arrow-down--regular' });
          const button = Domino.of('button')
            .classNames('dx-button bg-accent-bg')
            .attributes({ 'data-density': 'md' })
            .append(icon)
            .on('click', () => {
              setPinned(true);
              view.dispatch({
                effects: [
                  crawlerLineEffect.of({ line: -1, position: 'end', behavior: 'smooth' }),
                  // Re-engage the follower so it keeps tracking the bottom as content continues
                  // to stream after the catch-up jump.
                  crawlerActiveEffect.of({ active: true, instant: !streamed }),
                ],
              });
            });

          buttonContainer = Domino.of('div')
            .classNames('cm-scroll-button transition-opacity duration-300 opacity-0 z-1')
            .append(button).root as HTMLDivElement;

          view.scrollDOM.parentElement!.appendChild(buttonContainer);
        }
      },
    ),
  ];
};

/**
 * Attaches listeners to detect genuine user-initiated scrolling on an element.
 * Two sources are covered:
 *   - `wheel`: fires only from physical mouse wheel / trackpad gestures.
 *   - `pointerdown` on the scrollbar gutter: detected by comparing clientX to
 *     the element's clientWidth (the content area, excluding the scrollbar).
 * Returns a cleanup function that removes the listeners.
 */
// TODO(burdon): Still jumps when widgets are rendered.
// - Track position of specific element/line in document and scroll relative to that.
function createUserScrollDetector(element: HTMLElement, onUserScroll: () => void): () => void {
  return combine(
    addEventListener(element, 'wheel', () => onUserScroll(), { passive: true }),
    addEventListener(element, 'pointerdown', (event) => {
      // If the pointer lands beyond the content width it hit the scrollbar gutter.
      if (event.clientX > element.getBoundingClientRect().right - (element.offsetWidth - element.clientWidth)) {
        onUserScroll();
      }
    }),
  );
}
