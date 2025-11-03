//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { debounceAndThrottle } from '@dxos/async';
import { Domino } from '@dxos/react-ui';

import { scrollToLineEffect } from './scrolling';

// TODO(burdon): Reconcile with scrollToLineEffect (scrolling).
export const scrollToBottomEffect = StateEffect.define<any>();

export type AutoScrollOptions = {
  /** Auto-scroll when reaches the bottom. */
  autoScroll?: boolean;
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
  throttleDelay = 2_000,
  onAutoScroll,
}: Partial<AutoScrollOptions> = {}) => {
  let buttonContainer: HTMLDivElement | undefined;
  let hideTimeout: NodeJS.Timeout | undefined;
  let isPinned = true;

  // Temporarily hide the scrollbar while auto-scrolling.
  const hideScrollbar = (view: EditorView) => {
    view.scrollDOM.classList.add('cm-hide-scrollbar');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      view.scrollDOM.classList.remove('cm-hide-scrollbar');
    }, 1_000);
  };

  // Throttled scroll to bottom.
  const scrollToBottom = debounceAndThrottle((view: EditorView) => {
    isPinned = true;
    hideScrollbar(view);
    buttonContainer?.classList.add('opacity-0');
    const line = view.state.doc.lineAt(view.state.doc.length);
    view.dispatch({
      selection: { anchor: line.to, head: line.to },
      effects: scrollToLineEffect.of({ line: line.number, options: { position: 'end' } }),
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
      // NOTE: Geometry changed is triggered when tool block is opened.
      if (autoScroll && update.heightChanged && isPinned) {
        const scrollerRect = update.view.scrollDOM.getBoundingClientRect();
        const coords = update.view.coordsAtPos(update.state.doc.length);
        const distanceFromBottom = coords ? coords.bottom - scrollerRect.bottom : 0;
        if (distanceFromBottom > 0) {
          const shouldScroll = onAutoScroll?.({ view: update.view, distanceFromBottom }) ?? true;
          if (!shouldScroll) {
            return;
          }

          scrollToBottom(update.view);
        } else {
          buttonContainer?.classList.remove('opacity-0');
        }
      }
    }),

    // Detect user scroll.
    // NOTE: Multiple scroll events are triggered during programmatic smooth scrolling.
    /*
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
    */

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
                .children(Domino.of<any>('dx-icon').attributes({ icon: 'ph--arrow-down--regular' }))
                .on('click', () => {
                  // scrollToBottom(view);
                }),
            )
            .build();

          scroller?.appendChild(buttonContainer);
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
