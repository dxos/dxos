//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { debounce } from '@dxos/async';
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
  threshold = 100,
  throttleDelay = 1_000,
  onAutoScroll,
}: Partial<AutoScrollOptions> = {}) => {
  let buttonContainer: HTMLDivElement | undefined;
  let hideTimeout: NodeJS.Timeout | undefined;
  let lastScrollTop = 0;
  let isPinned = true;

  const setPinned = (pin: boolean) => {
    isPinned = pin;
    buttonContainer?.classList.toggle('opacity-0', pin);
  };

  // Temporarily hide the scrollbar while auto-scrolling.
  const hideScrollbar = (view: EditorView) => {
    view.scrollDOM.classList.add('cm-hide-scrollbar');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      view.scrollDOM.classList.remove('cm-hide-scrollbar');
    }, 1_000);
  };

  // Throttled scroll to bottom.
  const scrollToBottom = (view: EditorView) => {
    setPinned(true);
    hideScrollbar(view);
    const line = view.state.doc.lineAt(view.state.doc.length);
    view.dispatch({
      selection: { anchor: line.to, head: line.to },
      effects: scrollToLineEffect.of({ line: line.number, options: { position: 'end', offset: threshold } }),
    });
  };

  // Throttled check for distance from bottom (for downward scrolls only).
  const checkDistance = debounce((view: EditorView) => {
    const scrollerRect = view.scrollDOM.getBoundingClientRect();
    const coords = view.coordsAtPos(view.state.doc.length);
    const distanceFromBottom = coords ? coords.bottom - scrollerRect.bottom : 0;
    setPinned(distanceFromBottom <= threshold);
  }, 1_000);

  // Debounce scroll updates so rapid edits don't cause clunky scrolling.
  const triggerUpdate = debounce((view: EditorView) => scrollToBottom(view), throttleDelay);

  return [
    // Update listener for logging when scrolling is needed.
    EditorView.updateListener.of(({ view, transactions, heightChanged }) => {
      // TODO(burdon): Remove and use scrollToLineEffect instead.
      transactions.forEach((transaction) => {
        for (const effect of transaction.effects) {
          if (effect.is(scrollToBottomEffect)) {
            scrollToBottom(view);
          }
        }
      });

      // Maybe scroll if doc changed and pinned.
      // NOTE: Geometry changed is triggered when widgets change height (e.g., toggle tool block).
      if (heightChanged && autoScroll && isPinned) {
        const scrollerRect = view.scrollDOM.getBoundingClientRect();
        const coords = view.coordsAtPos(view.state.doc.length);
        const distanceFromBottom = coords ? coords.bottom - scrollerRect.bottom : 0;
        if (distanceFromBottom + threshold > 0) {
          const shouldScroll = onAutoScroll?.({ view, distanceFromBottom }) ?? true;
          if (shouldScroll) {
            triggerUpdate(view);
          }
        }
      }
    }),

    // Detect user scroll.
    EditorView.domEventHandlers({
      scroll: (event, view) => {
        const currentScrollTop = view.scrollDOM.scrollTop;
        const scrollingUp = currentScrollTop < lastScrollTop;
        lastScrollTop = currentScrollTop;

        // If user scrolls up, immediately unpin auto-scroll.
        if (scrollingUp) {
          setPinned(false);
          return;
        }

        // For downward scrolls, throttle the distance check.
        checkDistance(view);
      },
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
