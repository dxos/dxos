//
// Copyright 2025 DXOS.org
//

import { EditorView, ViewPlugin } from '@codemirror/view';

import { addEventListener, combine, throttle } from '@dxos/async';
import { Domino } from '@dxos/ui';

import { scrollerCrawlEffect, scrollerLineEffect } from './scroller';

export type AutoScrollToProps = {};

/**
 * Extension that supports pinning the scroll position and automatically scrolls to the bottom when content is added.
 */
export const autoScroll = (_: AutoScrollToProps = {}) => {
  let buttonContainer: HTMLDivElement | undefined;
  let isPinned = true;

  const setPinned = (pinned: boolean) => {
    buttonContainer?.classList.toggle('opacity-0', pinned);
    isPinned = pinned;
  };

  return [
    // Update listener for logging when scrolling is needed.
    EditorView.updateListener.of(({ view, heightChanged, state }) => {
      // Maybe scroll if doc changed and pinned.
      // NOTE: Geometry changed is triggered when widgets change height (e.g., toggle tool block).
      if (heightChanged) {
        if (isPinned) {
          // NOTE: Use scroll geometry instead of coordsAtPos to avoid forced layout/scroll side-effects.
          const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
          const delta = scrollHeight - scrollTop - clientHeight;
          if (delta > 0 && scrollTop > 0) {
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
          const icon = Domino.of('dx-icon' as any).attributes({ icon: 'ph--arrow-down--regular' });
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
