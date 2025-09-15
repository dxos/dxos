//
// Copyright 2025 DXOS.org
//

import { Effect, Fiber, Queue, Stream } from 'effect';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';

import { type ThemedClassName, useStateWithRef } from '@dxos/react-ui';
import { useThemeContext } from '@dxos/react-ui';
import {
  EditorView,
  autoScroll,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  preview,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { type StreamerOptions, type XmlTagOptions, extendedMarkdown, streamer, xmlTags } from './extensions';
import { createStreamer } from './stream';

export type MarkdownStreamController = {
  scrollToBottom: () => void;
  update: (text: string) => Promise<void>;
  append: (text: string) => Promise<void>;
};

export type MarkdownStreamProps = ThemedClassName<{
  content?: string;
  characterDelay?: number;
}> &
  XmlTagOptions &
  StreamerOptions;

export const MarkdownStream = forwardRef<MarkdownStreamController | null, MarkdownStreamProps>(
  ({ classNames, registry, content, characterDelay = 5, ...streamerOptions }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view } = useTextEditor(() => {
      return {
        initialValue: content,
        extensions: [
          createThemeExtensions({
            themeMode,
            slots: {
              scroll: {
                // NOTE: Child widgets must have `max-is-[100cqi]`.
                className: 'size-container pli-cardSpacingInline plb-cardSpacingBlock',
              },
            },
          }),
          extendedMarkdown({ registry }),
          createBasicExtensions({ lineWrapping: true, readOnly: true }),
          decorateMarkdown(),
          preview(),
          xmlTags({ registry }),
          streamer(streamerOptions),
          autoScroll(),
        ],
      };
    }, [themeMode, registry]);

    // Streaming queue.
    const [queue, setQueue, queueRef] = useStateWithRef(Effect.runSync(Queue.unbounded<string>()));
    useEffect(() => {
      if (!view) {
        return;
      }

      // Consume queue.
      const fork = Stream.fromQueue(queueRef.current).pipe(
        createStreamer(characterDelay),
        Stream.runForEach((text) =>
          Effect.sync(() => {
            view.dispatch({
              changes: [{ from: view.state.doc.length, insert: text }],
            });
          }),
        ),
        Effect.runFork,
      );

      return () => {
        void Effect.runPromise(Fiber.interrupt(fork));
      };
    }, [view, queue]);

    // Expose controller as API.
    useImperativeHandle(forwardedRef, () => {
      if (!view) {
        return null as any;
      }

      return {
        // Immediately scroll to bottom (and pin).
        scrollToBottom: () => {
          view.dispatch({
            effects: EditorView.scrollIntoView(view.state.doc.length, { y: 'end' }),
          });
        },
        // Update entire document.
        update: async (text: string) => {
          const queue = Effect.runSync(Queue.unbounded<string>());
          setQueue(queue);
          view.dispatch({
            changes: [{ from: 0, to: view.state.doc.length, insert: text }],
          });
        },
        // Append to queue (and stream).
        append: async (text: string) => {
          await Effect.runPromise(Queue.offer(queueRef.current, text));
        },
      };
    }, [view]);

    return <div ref={parentRef} className={mx('is-full overflow-hidden', classNames)} />;
  },
);
