//
// Copyright 2025 DXOS.org
//

import { useImperativeHandle } from '@preact-signals/safe-react/react';
import { Effect, Fiber, Queue, Stream } from 'effect';
import React, { forwardRef, useEffect } from 'react';

import { type ThemedClassName, useStateWithRef } from '@dxos/react-ui';
import { useThemeContext } from '@dxos/react-ui';
import {
  autoScroll,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { type StreamerOptions, type XmlTagOptions, extendedMarkdown, streamer, xmlTags } from './extensions';
import { createStreamer } from './stream';

export type MarkdownStreamController = {
  update: (text: string) => void;
  append: (text: string) => void;
};

export type MarkdownStreamProps = ThemedClassName<{
  content?: string;
  characterDelay?: number;
}> &
  XmlTagOptions &
  StreamerOptions;

export const MarkdownStream = forwardRef<MarkdownStreamController, MarkdownStreamProps>(
  ({ classNames, registry, content, characterDelay = 5, ...streamerOptions }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view } = useTextEditor(
      {
        initialValue: content,
        extensions: [
          createBasicExtensions({ lineWrapping: true, readOnly: true }),
          createThemeExtensions({
            themeMode,
            slots: {
              scroll: {
                className: 'pli-cardSpacingInline plb-cardSpacingBlock',
              },
            },
          }),
          extendedMarkdown({ registry }),
          decorateMarkdown(),
          xmlTags({ registry }),
          streamer(streamerOptions),
          autoScroll(),
        ],
      },
      [themeMode, registry],
    );

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

    // Expose contoller as API.
    useImperativeHandle(
      forwardedRef,
      () => ({
        // Update document.
        update: async (text: string) => {
          setQueue(Effect.runSync(Queue.unbounded<string>()));
          view?.dispatch({
            changes: [{ from: 0, to: view.state.doc.length, insert: text }],
          });
        },
        // Append to queue.
        append: async (text: string) => {
          await Effect.runPromise(Queue.offer(queueRef.current, text));
        },
      }),
      [view],
    );

    return <div ref={parentRef} className={mx('bs-full is-full overflow-hidden', classNames)} />;
  },
);
