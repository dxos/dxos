//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { debounce, debounceAndThrottle } from '@dxos/async';
import { Domino } from '@dxos/react-ui';

import { scrollToLineEffect } from './scrolling';

// TODO(burdon): Reconcile with scrollToLineEffect (scrolling).
export const scrollToBottomEffect = StateEffect.define<any>();

export type AutoScrollOptions = {
  /** Auto-scroll when reaches the bottom. */
  autoScroll?: boolean;
  /** Threshold in px to trigger scroll from bottom. */
  threshold?: number;
  /** Throttle time in ms. */
  throttleDelay?: number;
  /** Callback when auto-scrolling. */
  onAutoScroll?: (props: { view: EditorView; distanceFromBottom: number }) => boolean | void;
};

/**
 * Extension that supports pinning the scroll position and automatically scrolls to the bottom when content is added.
 */
// TODO(burdon): Reconcile with transcript-extension.
export const autoScroll = ({
  autoScroll = true,
  threshold = 64,
  throttleDelay = 2_000,
  onAutoScroll,
}: Partial<AutoScrollOptions> = {}) => {
  let buttonContainer: HTMLDivElement | undefined;
  let hideTimeout: NodeJS.Timeout | undefined;
  let isPinned = true;
  let lastScrollTop = 0;

  // Temporarily hide the scrollbar while auto-scrolling.
  const hideScrollbar = (view: EditorView) => {
    view.scrollDOM.classList.add('cm-hide-scrollbar');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      view.scrollDOM.classList.remove('cm-hide-scrollbar');
    }, 1_000);
  };

  const setPinned = (pin: boolean) => {
    isPinned = pin;
    buttonContainer?.classList.toggle('opacity-0', pin);
  };

  // Throttled scroll to bottom.
  const scrollToBottom = debounceAndThrottle((view: EditorView) => {
    setPinned(true);
    hideScrollbar(view);
    const line = view.state.doc.lineAt(view.state.doc.length);
    view.dispatch({
      selection: { anchor: line.to, head: line.to },
      effects: scrollToLineEffect.of({ line: line.number, options: { position: 'end', offset: threshold } }),
    });
  }, throttleDelay);

  return [
    // Update listener for logging when scrolling is needed.
    EditorView.updateListener.of((update) => {
      // TODO(burdon): Remove and use scrollToLineEffect instead.
      update.transactions.forEach((transaction) => {
        for (const effect of transaction.effects) {
          if (effect.is(scrollToBottomEffect)) {
            scrollToBottom(update.view);
          }
        }
      });

      // Maybe scroll if doc changed and pinned.
      // NOTE: Geometry changed is triggered when widgets change height (e.g., toggle tool block).
      if (autoScroll && update.heightChanged && isPinned) {
        const scrollerRect = update.view.scrollDOM.getBoundingClientRect();
        const coords = update.view.coordsAtPos(update.state.doc.length);
        const distanceFromBottom = coords ? coords.bottom - scrollerRect.bottom : 0;
        if (distanceFromBottom + threshold > 0) {
          const shouldScroll = onAutoScroll?.({ view: update.view, distanceFromBottom }) ?? true;
          if (!shouldScroll) {
            return;
          }

          scrollToBottom(update.view);
        }
      }
    }),

    // Detect user scroll.
    EditorView.domEventHandlers({
      scroll: debounce((event, view) => {
        const currentScrollTop = view.scrollDOM.scrollTop;
        const scrollingUp = currentScrollTop < lastScrollTop;
        lastScrollTop = currentScrollTop;

        // If user scrolls up, unpin auto-scroll.
        if (scrollingUp) {
          setPinned(false);
          return;
        }

        // For downward scrolls, check distance from bottom.
        const scrollerRect = view.scrollDOM.getBoundingClientRect();
        const coords = view.coordsAtPos(view.state.doc.length);
        const distanceFromBottom = coords ? coords.bottom - scrollerRect.bottom : 0;
        setPinned(distanceFromBottom < threshold);
      }, 1_000),
    }),

    // Scroll button.
    ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          buttonContainer = Domino.of('div')
            .classNames(true && 'cm-scroll-button transition-opacity duration-300 opacity-0')
            .children(
              Domino.of('button')
                .classNames('dx-button bg-accentSurface')
                .data('density', 'fine')
                .children(Domino.of<any>('dx-icon').attributes({ icon: 'ph--arrow-down--regular' }))
                .on('click', () => {
                  scrollToBottom(view);
                }),
            )
            .build();

          view.scrollDOM.parentElement!.appendChild(buttonContainer);
        }
      },
    ),

    // Styles.
    EditorView.theme({
      '.cm-scroller': {
        scrollbarWidth: 'thin',
      },
      '.cm-scroller.cm-hide-scrollbar': {
        scrollbarWidth: 'none',
      },
      '.cm-scroller.cm-hide-scrollbar::-webkit-scrollbar': {
        display: 'none',
      },
      '.cm-scroll-button': {
        position: 'absolute',
        bottom: '0.5rem',
        right: '1rem',
      },
    }),
  ];
};
