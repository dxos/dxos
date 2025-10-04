//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { Domino } from '../util';

const lineHeight = 24;

export const scrollToBottomEffect = StateEffect.define<any>();

export type AutoScrollOptions = {
  overscroll: number;
  throttle: number;
};

/**
 * Extension that supports pinning the scroll position and automatically scrolls to the bottom when content is added.
 */
// TODO(burdon): Reconcile with transcript-extension.
export const autoScroll = ({ overscroll = 4 * lineHeight, throttle = 2_000 }: Partial<AutoScrollOptions> = {}) => {
  let isThrottled = false;
  let isPinned = true;
  let timeout: NodeJS.Timeout | undefined;
  let buttonContainer: HTMLDivElement;
  let lastScrollTop = 0;
  let scrollCounter = 0;

  const hideScrollbar = (view: EditorView) => {
    view.scrollDOM.classList.add('cm-hide-scrollbar');
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      view.scrollDOM.classList.remove('cm-hide-scrollbar');
    }, 1_000);
  };

  const scrollToBottom = (view: EditorView) => {
    isPinned = true;
    scrollCounter = 0;
    buttonContainer?.classList.add('opacity-0');
    requestAnimationFrame(() => {
      hideScrollbar(view);
      view.scrollDOM.scrollTo({
        top: view.scrollDOM.scrollHeight,
        behavior: 'smooth',
      });
    });
  };

  return [
    // Scroll button.
    ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          const scroller = view.scrollDOM.parentElement;
          buttonContainer = Domino.of('div')
            .classNames(true && 'cm-scroll-button transition-opacity duration-300 opacity-0')
            .children(
              Domino.of('button')
                .classNames('dx-button bg-accentSurface')
                .data('density', 'fine')
                .children(Domino.of<any>('dx-icon').attr('icon', 'ph--arrow-down--regular'))
                .on('click', () => {
                  scrollToBottom(view);
                }),
            )
            .build();
          scroller?.appendChild(buttonContainer);
        }
      },
    ),

    // Update listener for logging when scrolling is needed.
    EditorView.updateListener.of((update) => {
      // Listen for effects.
      update.transactions.forEach((transaction) => {
        for (const effect of transaction.effects) {
          if (effect.is(scrollToBottomEffect)) {
            scrollToBottom(update.view);
          }
        }
      });

      if (update.docChanged && isPinned && !isThrottled) {
        const distanceFromBottom = calcDistance(update.view.scrollDOM);

        // Keep pinned.
        if (distanceFromBottom >= overscroll) {
          isThrottled = true;
          requestAnimationFrame(() => {
            scrollToBottom(update.view);
          });

          // Reset throttle.
          setTimeout(() => {
            isThrottled = false;
          }, throttle);
        }
      }
    }),

    // Detect user scroll.
    // NOTE: Multiple scroll events are triggered during programmatic smooth scrolling.
    EditorView.domEventHandlers({
      scroll: (event, view) => {
        const scroller = view.scrollDOM;
        // Suspect delta goes positive when rendering widgets, so count positive deltas.
        // TODO(burdon): Detect user scroll directly (wheel, touch, keys, etc.)
        if (lastScrollTop > scroller.scrollTop) {
          scrollCounter++;
        }
        lastScrollTop = scroller.scrollTop;
        const distanceFromBottom = calcDistance(scroller);
        if (distanceFromBottom === 0) {
          // Pin to bottom.
          isPinned = true;
          buttonContainer?.classList.add('opacity-0');
          scrollCounter = 0;
        } else if (scrollCounter > 3) {
          // Break pin if user scrolls up.
          isPinned = false;
          buttonContainer?.classList.remove('opacity-0');
        }
      },
    }),

    EditorView.theme({
      '.cm-scroller': {
        paddingBottom: `${overscroll}px`,
        scrollbarWidth: 'thin',
      },
      '.cm-scroller.cm-hide-scrollbar': {
        scrollbarWidth: 'none',
      },
      '.cm-scroller.cm-hide-scrollbar::-webkit-scrollbar': {
        display: 'none',
      },

      // TODO(burdon): IconButton.
      '.cm-scroll-button': {
        position: 'absolute',
        bottom: '0.5rem',
        right: '1rem',
      },
    }),
  ];
};

const calcDistance = (scroller: HTMLElement) => {
  const scrollTop = scroller.scrollTop;
  const scrollHeight = scroller.scrollHeight;
  const clientHeight = scroller.clientHeight;
  const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
  return distanceFromBottom;
};
