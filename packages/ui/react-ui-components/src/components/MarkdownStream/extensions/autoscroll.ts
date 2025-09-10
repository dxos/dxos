//
// Copyright 2025 DXOS.org
//

import { ViewPlugin } from '@codemirror/view';

import { EditorView } from '@dxos/react-ui-editor';

import { Domino } from '../domino';

const lineHeight = 24;

export type AutoScrollOptions = {
  overscroll?: number;
  throttle?: number;
};

/**
 * Extension that supports pinning the scroll position and automatically scrolls to the bottom when content is added.
 */
// TODO(burdon): Move to react-ui-editor.
// TODO(burdon): Reconcile with transcript-extension.
export const autoScroll = ({ overscroll = 4 * lineHeight, throttle = 1_000 }: AutoScrollOptions = {}) => {
  let isThrottled = false;
  let isPinned = true;
  let lastScrollTop = 0;
  let timeout: NodeJS.Timeout | undefined;
  let buttonContainer: HTMLDivElement;

  const hideScrollbar = (scroller: HTMLElement) => {
    scroller.classList.add('cm-hide-scrollbar');
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      scroller.classList.remove('cm-hide-scrollbar');
    }, 1_000);
  };

  const scrollToBottom = (scroller: HTMLElement) => {
    isPinned = true;
    buttonContainer?.classList.add('opacity-0');
    scroller.scrollTo({
      top: scroller.scrollHeight - scroller.clientHeight,
      behavior: 'smooth',
    });
  };

  return [
    ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          const scroller = view.scrollDOM.parentElement;
          buttonContainer = Domino.of('div')
            .classNames(true && 'cm-scroll-button transition-opacity duration-300 opacity-0')
            .child(
              Domino.of('button')
                .classNames('dx-button bg-accentSurface')
                .data('density', 'fine')
                .child(Domino.of<any>('dx-icon').attr('icon', 'ph--arrow-down--regular'))
                .on('click', () => {
                  const scroller = view.scrollDOM;
                  hideScrollbar(scroller);
                  scrollToBottom(scroller);
                }),
            )
            .build();
          scroller?.appendChild(buttonContainer);
        }
      },
    ),

    // Update listener for logging when scrolling is needed.
    EditorView.updateListener.of((update) => {
      if (update.docChanged && isPinned && !isThrottled) {
        const scroller = update.view.scrollDOM;
        const distanceFromBottom = calcDistance(scroller);

        // Hide scrollbar even if not scrolling to bottom.
        hideScrollbar(scroller);

        // Keep pinned.
        if (distanceFromBottom > overscroll) {
          isThrottled = true;
          requestAnimationFrame(() => {
            scrollToBottom(scroller);
          });

          // Reset throttle.
          setTimeout(() => {
            isThrottled = false;
          }, throttle);
        }
      }
    }),

    EditorView.domEventHandlers({
      scroll: (event, view) => {
        const scroller = view.scrollDOM;
        const distanceFromBottom = calcDistance(scroller);
        if (distanceFromBottom === 0) {
          // Pin to bottom.
          isPinned = true;
          buttonContainer?.classList.add('opacity-0');
        } else if (scroller.scrollTop < lastScrollTop) {
          // Break pin if user scrolls up.
          isPinned = false;
          buttonContainer?.classList.remove('opacity-0');
        }

        lastScrollTop = scroller.scrollTop;
      },
    }),

    EditorView.theme({
      '.cm-scroller': {
        paddingBottom: `${overscroll}px`,
        scrollbarWidth: 'thin',
      },
      // '.cm-scroller::-webkit-scrollbar-thumb': {
      //   borderRadius: '0px',
      // },
      '.cm-scroller.cm-hide-scrollbar': {
        scrollbarWidth: 'none',
      },
      '.cm-scroller.cm-hide-scrollbar::-webkit-scrollbar': {
        display: 'none',
      },

      // TODO(burdon): IconButton.
      '.cm-scroll-button': {
        position: 'absolute',
        bottom: '0.75rem',
        right: '0.75rem',
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
