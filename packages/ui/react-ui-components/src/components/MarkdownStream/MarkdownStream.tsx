//
// Copyright 2025 DXOS.org
//

import { useImperativeHandle } from '@preact-signals/safe-react/react';
import { Effect, Fiber, Queue, Stream } from 'effect';
import React, { forwardRef, useEffect, useRef } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { useThemeContext } from '@dxos/react-ui';
import {
  autoScroll,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { getDebugName } from '@dxos/util';

import { type StreamerOptions, type XmlTagOptions, extendedMarkdown, streamer, xmlTags } from './extensions';
import { streamDelay } from './stream-delay';

export type MarkdownStreamController = {
  update: (text: string) => void;
  append: (text: string) => void;
};

export type MarkdownStreamProps = ThemedClassName<{
  content?: string;
}> &
  XmlTagOptions &
  StreamerOptions;

export const MarkdownStream = forwardRef<MarkdownStreamController, MarkdownStreamProps>(
  ({ classNames, registry, content, ...streamerOptions }, forwardedRef) => {
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
          autoScroll(),
          streamer(streamerOptions),
        ],
      },
      [themeMode, registry],
    );

    // const [queue, setQueue, queueRef] = useStateWithRef(Effect.runSync(Queue.unbounded<string>()));
    const queueRef = useRef(Effect.runSync(Queue.unbounded<string>()));
    const subbed = useRef(false);
    useEffect(() => {
      console.log('useEffect', { queue: getDebugName(queueRef.current) });
      if (subbed.current) {
        return;
      }
      subbed.current = true;

      const fork = Stream.fromQueue(queueRef.current).pipe(
        streamDelay({ delay: '5 millis' }),
        Stream.runForEach((text) =>
          Effect.sync(() => {
            console.log('consumer', text);
            view?.dispatch({
              changes: [{ from: view.state.doc.length, insert: text }],
            });
          }),
        ),
        Effect.runFork,
      );

      void Effect.runPromise(Queue.offer(queueRef.current, '1123'));

      return () => {
        console.log('cleanup', getDebugName(queueRef.current));
        void Effect.runPromise(Fiber.interrupt(fork));
      };
    }, []);

    console.log('render', { queue: getDebugName(queueRef.current) });

    useImperativeHandle(
      forwardedRef,
      () => ({
        update: async (text: string) => {
          // setQueue(Effect.runSync(Queue.unbounded<string>()));
          view?.dispatch({
            changes: [{ from: 0, to: view.state.doc.length, insert: text }],
          });
        },
        append: async (text: string) => {
          //
          // const queue = Effect.runSync(Queue.unbounded<string>());
          // const fork = Stream.fromQueue(queue).pipe(
          //   streamDelay({ delay: '5 millis' }),
          //   Stream.runForEach((text) =>
          //     Effect.sync(() => {
          //       console.log('consumer', text);
          //     }),
          //   ),
          //   Effect.runPromise,
          // );
          // void Effect.runPromise(Queue.offer(queue, '1'));

          console.log('producer', { text, queue: getDebugName(queueRef.current) });
          await Effect.runPromise(Queue.offer(queueRef.current, text));
        },
      }),
      [view],
    );

    return <div ref={parentRef} className={mx('is-full overflow-hidden', classNames)} />;
  },
);
