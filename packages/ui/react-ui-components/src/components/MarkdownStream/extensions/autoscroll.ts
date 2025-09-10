//
// Copyright 2025 DXOS.org
//

import { ViewPlugin } from '@codemirror/view';

import { EditorView } from '@dxos/react-ui-editor';

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

  const hideScrollbar = (scroller: HTMLElement) => {
    scroller.classList.add('cm-hide-scrollbar');
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      scroller.classList.remove('cm-hide-scrollbar');
    }, 1_000);
  };

  const scrollToBottom = (scroller: HTMLElement) => {
    isPinned = true;
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
          const button = document.createElement('button');
          button.className = 'cm-scroll-button dx-button';
          button.textContent = 'Scroll';
          button.onclick = () => {
            const scroller = view.scrollDOM;
            hideScrollbar(scroller);
            scrollToBottom(scroller);
          };
          scroller?.appendChild(button);
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
        } else if (scroller.scrollTop < lastScrollTop) {
          // Break pin if user scrolls up.
          isPinned = false;
        }

        lastScrollTop = scroller.scrollTop;
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
        right: '0.5rem',
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
