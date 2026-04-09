//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { addEventListener, combine, throttle } from '@dxos/async';
import { Domino } from '@dxos/ui';

import { scrollerCrawlEffect, scrollerLineEffect } from './scroller';
import { getSize } from '@dxos/ui-theme';

/** Enable or disable autoscroll. */
export const autoScrollEffect = StateEffect.define<boolean>();

export type AutoScrollProps = {};

/**
 * Extension that supports pinning the scroll position and automatically scrolls to the bottom when content is added.
 */
export const autoScroll = (_: AutoScrollProps = {}) => {
  let buttonContainer: HTMLDivElement | undefined;
  let isPinned = true;
  let jumpPending = false;
  let enabled = true;

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
                effects: scrollerCrawlEffect.of(true),
              });
            } else {
              view.dispatch({
                effects: scrollerCrawlEffect.of(false),
              });
            }
          }
        }
      }

      if (!enabled) {
        return;
      }

      // Jump to bottom instantly when content is first inserted into an empty doc.
      if (isPinned && startState.doc.length === 0 && state.doc.length > 0) {
        jumpPending = true;
        requestAnimationFrame(() => {
          view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight;
          jumpPending = false;
        });
        return;
      }

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
          if (delta > 0) {
            setPinned(true);
            view.dispatch({
              effects: scrollerCrawlEffect.of(true),
            });
          } else if (delta < 0) {
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

    // Detect user scroll and unpin (or re-pin if scrolled to the bottom).
    ViewPlugin.fromClass(
      class {
        private readonly cleanup: () => void;
        constructor(view: EditorView) {
          this.cleanup = createUserScrollDetector(
            view.scrollDOM,
            throttle(() => {
              requestAnimationFrame(() => {
                const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
                const delta = scrollHeight - scrollTop - clientHeight;
                const pinned = delta === 0;
                setPinned(pinned);
                if (!pinned) {
                  view.dispatch({ effects: scrollerCrawlEffect.of(false) });
                }
              });
            }, 500),
          );
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
            .classNames('dx-button bg-accent-surface')
            .attributes({ 'data-density': 'fine' })
            .children(icon)
            .on('click', () => {
              setPinned(true);
              view.dispatch({
                effects: scrollerLineEffect.of({ line: -1, position: 'end', behavior: 'smooth' }),
              });
            });

          buttonContainer = Domino.of('div')
            .classNames('cm-scroll-button transition-opacity duration-300 opacity-0')
            .children(button).root as HTMLDivElement;

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
