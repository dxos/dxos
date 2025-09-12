//
// Copyright 2025 DXOS.org
//

import { type Extension, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, WidgetType } from '@codemirror/view';

import { EditorView } from '@dxos/react-ui-editor';
import { isNotFalsy } from '@dxos/util';

export type StreamerOptions = {
  autoScroll?: boolean;
  cursor?: boolean;
  fadeIn?: boolean;
};

/**
 * Extension that adds a blinking cursor widget at the end of the document.
 */
export const streamer = (options: StreamerOptions = {}): Extension => {
  return [
    // Options.
    options.autoScroll && autoScroll(),
    options.cursor && cursor(),
    options.fadeIn && fadeIn(),
  ].filter(isNotFalsy);
};

/**
 * Extension that automatically scrolls to the bottom when content is added.
 */
// TODO(burdon): Stop auto-scrolling if user scrolls.
const autoScroll = (overscroll = 160, throttle = 2_000) => {
  let isThrottled = false;

  return [
    // Update listener for logging when scrolling is needed.
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const view = update.view;
        const scroller = view.scrollDOM;
        const scrollTop = scroller.scrollTop;
        const scrollHeight = scroller.scrollHeight;
        const clientHeight = scroller.clientHeight;
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        if (distanceFromBottom > overscroll) {
          if (!isThrottled) {
            isThrottled = true;
            scroller.scrollTo({
              top: scroller.scrollHeight - scroller.clientHeight,
              behavior: 'smooth',
            });

            // Reset throttle after delay.
            setTimeout(() => {
              isThrottled = false;
            }, throttle);
          }
        }
      }
    }),

    EditorView.theme({
      '.cm-scroller': {
        paddingBottom: `${overscroll}px`,
        scrollbarWidth: 'none',
      },
      '.hide-scrollbar::-webkit-scrollbar': {
        display: 'none',
      },
      '.cm-scroller::-webkit-scrollbar': {
        display: 'none',
      },
    }),
  ];
};

/**
 * State field to manage the cursor widget decoration.
 */
const cursor = (): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: () => Decoration.none,
      update: (_decorations, tr) => {
        // Always place cursor at the end of the document.
        const endPos = tr.state.doc.length;
        return Decoration.set([
          Decoration.widget({
            widget: new CursorWidget(),
            side: 1, // Place after the position.
          }).range(endPos),
        ]);
      },
      provide: (f) => EditorView.decorations.from(f),
    }),

    EditorView.theme({
      '@keyframes blink': {
        '0%, 50%': { opacity: '1' },
        '51%, 100%': { opacity: '0' },
      },
      '.typewriter-cursor': {
        color: 'currentColor',
        fontWeight: 'normal',
        display: 'inline-block',
      },
    }),
  ];
};

/**
 * Widget class for the cursor at the end of the document.
 */
class CursorWidget extends WidgetType {
  toDOM() {
    const root = document.createElement('span');
    root.style.opacity = '0.2';
    const span = document.createElement('span');
    span.textContent = '▌';
    span.style.marginLeft = '2px';
    span.style.animation = 'blink 1s infinite';
    root.appendChild(span);
    return root;
  }
}

/**
 * State field to detect and decorate appended text.
 */
const fadeIn = (): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: () => Decoration.none,
      update: (decorations, tr) => {
        if (!tr.docChanged) {
          return decorations;
        }

        // Check if content was appended at the end.
        const newDecorations: any[] = [];

        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          // Check if the change is at the end of the document.
          if (toA === tr.startState.doc.length && inserted.length > 0) {
            // This is an append operation.
            newDecorations.push(
              Decoration.mark({
                class: 'cm-typewriter-append',
              }).range(fromB, toB),
            );
          }
        });

        if (newDecorations.length > 0) {
          // Combine existing decorations with new ones.
          return decorations.update({
            add: newDecorations,
            filter: (_from, _to) => {
              // Remove old decorations after a certain time or keep them.
              return true;
            },
          });
        }

        return decorations;
      },
      provide: (f) => EditorView.decorations.from(f),
    }),

    EditorView.theme({
      '.cm-typewriter-append': {
        animation: 'typewriter-fade-in 0.5s ease-out forwards',
      },
      '@keyframes typewriter-fade-in': {
        '0%': {
          opacity: '0',
        },
        '100%': {
          opacity: '1',
        },
      },
    }),
  ];
};
