//
// Copyright 2025 DXOS.org
//

import { type Extension, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, WidgetType } from '@codemirror/view';

import { EditorView } from '@dxos/react-ui-editor';
import { isNotFalsy } from '@dxos/util';

export type TypewriterOptions = {
  cursor?: boolean;
  fadeIn?: boolean;
  autoScroll?: boolean;
};

/**
 * Extension that adds a blinking cursor widget at the end of the document.
 */
export const typewriter = (options: TypewriterOptions = {}): Extension => {
  return [
    options.cursor && cursorField(),
    options.cursor && cursorTheme,
    options.fadeIn && appendDetectionField(),
    options.fadeIn && appendTheme,
    options.autoScroll && autoScrollExtension(),
  ].filter(isNotFalsy);
};

/**
 * State field to manage the cursor widget decoration.
 */
const cursorField = (): StateField<DecorationSet> => {
  return StateField.define<DecorationSet>({
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
  });
};

/**
 * Widget class for the cursor at the end of the document.
 */
class CursorWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.textContent = '▌';
    span.style.marginLeft = '2px';
    span.style.animation = 'blink 1s infinite';
    return span;
  }
}

/**
 * CSS for the blinking cursor animation.
 */
const cursorTheme = EditorView.theme({
  '@keyframes blink': {
    '0%, 50%': { opacity: '1' },
    '51%, 100%': { opacity: '0' },
  },
  '.typewriter-cursor': {
    color: 'currentColor',
    fontWeight: 'normal',
    display: 'inline-block',
  },
});

/**
 * State field to detect and decorate appended text.
 */
const appendDetectionField = (): StateField<DecorationSet> => {
  return StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update: (decorations, tr) => {
      if (!tr.docChanged) {
        return decorations;
      }

      // Check if content was appended at the end
      const newDecorations: any[] = [];

      tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        // Check if the change is at the end of the document
        if (toA === tr.startState.doc.length && inserted.length > 0) {
          // This is an append operation
          newDecorations.push(
            Decoration.mark({
              class: 'cm-typewriter-append',
            }).range(fromB, toB),
          );
        }
      });

      if (newDecorations.length > 0) {
        // Combine existing decorations with new ones
        return decorations.update({
          add: newDecorations,
          filter: (_from, _to) => {
            // Remove old decorations after a certain time or keep them
            // For now, we'll keep all decorations
            return true;
          },
        });
      }

      return decorations;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
};

/**
 * CSS theme for appended text decorations.
 */
const appendTheme = EditorView.theme({
  '.cm-typewriter-append': {
    animation: 'typewriter-fade-in 2s ease-out forwards',
  },
  '@keyframes typewriter-fade-in': {
    '0%': {
      opacity: '0',
    },
    '100%': {
      opacity: '1',
    },
  },
});

/**
 * Extension that automatically scrolls to the bottom when content is added.
 */
// TODO(burdon): Scrolling jitters while content is still being added.
const autoScrollExtension = (overscroll = 160, throttle = 2_000) => {
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
            // console.log('scroll', scroller.scrollHeight - scroller.clientHeight);
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

    // Add padding at the bottom for overscroll and hide scrollbar.
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

// TODO(burdon): Turn this into a CM extension.
/*
const Trail = ({ text, length = 8 }: { text?: string; length?: number }) => {
  return (
    <span>
      {text?.split('').map((c, i) => (
        <span key={i} style={{ opacity: 1 - i / length }}>
          {c}
        </span>
      ))}
    </span>
  );
};
*/
