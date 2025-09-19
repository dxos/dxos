//
// Copyright 2025 DXOS.org
//

import { Effect, Fiber, Queue, Stream } from 'effect';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';

import { log } from '@dxos/log';
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

import {
  type StreamerOptions,
  type XmlTagsOptions,
  type XmlWidgetStateManager,
  extendedMarkdown,
  streamer,
  xmlTagContextEffect,
  xmlTagResetEffect,
  xmlTagUpdateEffect,
  xmlTags,
} from './extensions';
import { createStreamer } from './stream';

export type MarkdownStreamController = {
  scrollToBottom: () => void;
  setContext: (context: any) => void;
  reset: (text: string) => Promise<void>;
  append: (text: string) => Promise<void>;
} & Pick<XmlWidgetStateManager, 'updateWidget'>;

export type MarkdownStreamProps = ThemedClassName<{ content?: string }> & XmlTagsOptions & StreamerOptions;

export const MarkdownStream = forwardRef<MarkdownStreamController | null, MarkdownStreamProps>(
  ({ classNames, registry, content, ...streamerOptions }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view } = useTextEditor(() => {
      return {
        initialValue: content,
        extensions: [
          createThemeExtensions({
            themeMode,
            syntaxHighlighting: true,
            slots: {
              scroll: {
                // NOTE: Child widgets must have `max-is-[100cqi]`.
                className: 'size-container pli-cardSpacingInline plb-cardSpacingBlock',
              },
            },
          }),
          extendedMarkdown({ registry }),
          createBasicExtensions({ lineWrapping: true, readOnly: true }),
          decorateMarkdown({
            skip: (node) => (node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:'),
          }),
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
        createStreamer,
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
        // Set the context for XML tags.
        setContext: (context: any) => {
          view.dispatch({
            effects: xmlTagContextEffect.of(context),
          });
        },
        // Reset document.
        reset: async (text: string) => {
          const queue = Effect.runSync(Queue.unbounded<string>());
          setQueue(queue);
          log.info('update', { from: 0, to: view.state.doc.length, text });
          view.dispatch({
            effects: [xmlTagContextEffect.of(null), xmlTagResetEffect.of(null)],
            changes: [{ from: 0, to: view.state.doc.length, insert: text }],
          });
        },
        // Append to queue (and stream).
        append: async (text: string) => {
          if (text.length) {
            await Effect.runPromise(Queue.offer(queueRef.current, text));
          }
        },
        // Update widget.
        updateWidget: (id: string, value: any) => {
          view.dispatch({
            effects: xmlTagUpdateEffect.of({ id, value }),
          });
        },
      } satisfies MarkdownStreamController;
    }, [view]);

    useEffect(() => {
      return () => {
        view?.destroy();
      };
    }, [view]);

    return <div ref={parentRef} className={mx('bs-full is-full overflow-hidden', classNames)} />;
  },
);
