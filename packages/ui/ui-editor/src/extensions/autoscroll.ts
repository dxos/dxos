//
// Copyright 2025 DXOS.org
//

import { StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { debounce } from '@dxos/async';
import { $ } from '@dxos/ui';

import { scrollToLineEffect } from './scrolling';

// TODO(burdon): Reconcile with scrollToLineEffect (scrolling).
export const scrollToBottomEffect = StateEffect.define<ScrollBehavior | undefined>();

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
  const scrollToBottom = (view: EditorView, behavior?: ScrollBehavior) => {
    setPinned(true);
    hideScrollbar(view);
    const line = view.state.doc.lineAt(view.state.doc.length);
    view.dispatch({
      selection: { anchor: line.to, head: line.to },
      effects: scrollToLineEffect.of({
        line: line.number,
        options: { position: 'end', offset: threshold, behavior },
      }),
    });
  };

  // Throttled check for distance from bottom (for downward scrolls only).
  const checkDistance = debounce((view: EditorView) => {
    const scrollerRect = view.scrollDOM.getBoundingClientRect();
    const coords = view.coordsAtPos(view.state.doc.length);
    const distanceFromBottom = coords ? coords.bottom - scrollerRect.bottom : 0;
    setPinned(distanceFromBottom < 0);
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
            scrollToBottom(view, effect.value);
          }
        }
      });

      // Maybe scroll if doc changed and pinned.
      // NOTE: Geometry changed is triggered when widgets change height (e.g., toggle tool block).
      if (heightChanged && isPinned) {
        const coords = view.coordsAtPos(view.state.doc.length);
        const scrollerRect = view.scrollDOM.getBoundingClientRect();
        const distanceFromBottom = coords ? scrollerRect.bottom - coords.bottom : 0;
        if (autoScroll && distanceFromBottom < threshold) {
          const shouldScroll = onAutoScroll?.({ view, distanceFromBottom }) ?? true;
          if (shouldScroll) {
            triggerUpdate(view);
          }
        } else if (distanceFromBottom < 0) {
          setPinned(false);
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
        } else {
          checkDistance(view);
        }
      },
    }),

    // Scroll button.
    ViewPlugin.fromClass(
      class {
        constructor(view: EditorView) {
          const icon = $('<dx-icon>').attr('icon', 'ph--arrow-down--regular').get(0)!;
          const button = $('<button>')
            .addClass('dx-button bg-accentSurface')
            .attr('data-density', 'fine')
            .append(icon)
            .on('click', () => {
              scrollToBottom(view);
            })
            .get(0)!;
          buttonContainer = $('<div>')
            .addClass('cm-scroll-button transition-opacity duration-300 opacity-0')
            .append(button)
            .get(0)! as HTMLDivElement;

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
