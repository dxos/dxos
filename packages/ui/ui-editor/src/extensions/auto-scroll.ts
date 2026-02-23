//
// Copyright 2025 DXOS.org
//

import { EditorView, ViewPlugin } from '@codemirror/view';

import { addEventListener, combine } from '@dxos/async';
import { Domino } from '@dxos/ui';

import { scrollCancelEffect, scrollToLineEffect } from './smooth-scroll';

export type AutoScrollOptions = {
  /** Threshold in px to trigger scroll from bottom. */
  overScroll?: number;
  /** Throttle time in ms. */
  throttleDelay?: number;
  /** Callback when auto-scrolling. */
  onAutoScroll?: (props: { view: EditorView; distanceFromBottom: number }) => boolean | void;
};

/**
 * Extension that supports pinning the scroll position and automatically scrolls to the bottom when content is added.
 */
export const autoScroll = ({
  overScroll = 100,
  throttleDelay = 1_000,
  onAutoScroll,
}: Partial<AutoScrollOptions> = {}) => {
  let buttonContainer: HTMLDivElement | undefined;
  let isPinned = true;

  const setPinned = (pinned: boolean) => {
    buttonContainer?.classList.toggle('opacity-0', pinned);
    isPinned = pinned;
  };

  const scrollToBottom = (view: EditorView, behavior?: ScrollBehavior) => {
    setPinned(true);
    view.dispatch({
      effects: scrollToLineEffect.of({
        line: -1,
        options: { position: 'end', behavior },
      }),
    });
  };

  // Throttled scroll to bottom with interval.
  const triggerUpdate = intervalUntilQuiet((view: EditorView) => {
    if (isPinned) {
      scrollToBottom(view);
    }
  }, throttleDelay);

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
          if (delta > 0) {
            const shouldScroll = onAutoScroll?.({ view, distanceFromBottom: delta }) ?? true;
            if (shouldScroll) {
              triggerUpdate(view);
            }
          } else if (delta < 0) {
            setPinned(false);
          }
        } else {
          // TODO(burdon): Pin if shrinks.
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
          this.cleanup = createUserScrollDetector(view.scrollDOM, () => {
            requestAnimationFrame(() => {
              const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
              const delta = scrollHeight - scrollTop - clientHeight;
              const pinned = delta === 0;
              setPinned(pinned);
              if (!pinned) {
                view.dispatch({ effects: scrollCancelEffect.of(undefined) });
              }
            });
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
          const icon = Domino.of('dx-icon' as any).attributes({ icon: 'ph--arrow-down--regular' });
          const button = Domino.of('button')
            .classNames('dx-button bg-accent-surface')
            .attributes({ 'data-density': 'fine' })
            .children(icon)
            .on('click', () => {
              scrollToBottom(view);
            });

          buttonContainer = Domino.of('div')
            .classNames('cm-scroll-button transition-opacity duration-300 opacity-0')
            .children(button).root as HTMLDivElement;

          view.scrollDOM.parentElement!.appendChild(buttonContainer);
        }
      },
    ),

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

/**
 * Invokes the function at most once per interval.
 * The function is called immediately on the first call (throttle),
 * prevents calls during the throttle window,
 * and ensures a final call happens after activity stops (debounce).
 */
function intervalUntilQuiet<T extends (...args: any[]) => void>(fn: T, interval: number): T {
  let timer: ReturnType<typeof setInterval> | null = null;
  let quietTimer: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Parameters<T>;

  return ((...args: Parameters<T>) => {
    // Always track the latest arguments so the interval fires with fresh values.
    latestArgs = args;

    // Reset the quiet timer on every call.
    if (quietTimer) {
      clearTimeout(quietTimer);
    }
    quietTimer = setTimeout(() => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      quietTimer = null;
    }, interval);

    // Start the interval on the leading edge if not already running.
    if (!timer) {
      fn(...latestArgs);
      timer = setInterval(() => fn(...latestArgs), interval);
    }
  }) as unknown as T;
}
