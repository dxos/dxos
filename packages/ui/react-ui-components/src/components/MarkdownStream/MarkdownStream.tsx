//
// Copyright 2025 DXOS.org
//

import { EditorSelection, Transaction } from '@codemirror/state';
import { Effect, Fiber, Queue, Stream } from 'effect';
import React, {
  Component,
  type ErrorInfo,
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { addEventListener } from '@dxos/async';
import { type ThemedClassName, useStateWithRef } from '@dxos/react-ui';
import { useThemeContext } from '@dxos/react-ui';
import {
  type StreamerOptions,
  type XmlTagsOptions,
  type XmlWidgetState,
  type XmlWidgetStateManager,
  autoScroll,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  extendedMarkdown,
  preview,
  scrollToBottomEffect,
  streamer,
  useTextEditor,
  xmlTagContextEffect,
  xmlTagResetEffect,
  xmlTagUpdateEffect,
  xmlTags,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { createStreamer } from './stream';

export type MarkdownStreamController = {
  scrollToBottom: () => void;
  setContext: (context: any) => void;
  reset: (text: string) => Promise<void>;
  append: (text: string) => Promise<void>;
} & Pick<XmlWidgetStateManager, 'updateWidget'>;

export type MarkdownStreamEvent = {
  type: 'submit';
  value: string | null;
};

export type MarkdownStreamProps = ThemedClassName<{
  content?: string;
  onEvent?: (event: MarkdownStreamEvent) => void;
}> &
  XmlTagsOptions &
  StreamerOptions;

export const MarkdownStream = forwardRef<MarkdownStreamController | null, MarkdownStreamProps>(
  ({ classNames, registry, content, onEvent, ...streamerOptions }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
    const { parentRef, view } = useTextEditor(() => {
      return {
        initialValue: content,
        selection: EditorSelection.cursor(content?.length ?? 0),
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
          createBasicExtensions({ lineWrapping: true, readOnly: true }),
          extendedMarkdown({ registry }),
          decorateMarkdown({
            skip: (node) => (node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:'),
          }),
          preview(),
          xmlTags({ registry, setWidgets }),
          streamer(streamerOptions),
          autoScroll({}),
        ],
      };
    }, [themeMode, registry]);

    // Streaming queue.
    const [queue, setQueue, queueRef] = useStateWithRef(Effect.runSync(Queue.unbounded<string>()));
    useEffect(() => {
      if (!view) {
        return;
      }

      // Consume queue and update document.
      const fork = Stream.fromQueue(queueRef.current).pipe(
        createStreamer,
        Stream.runForEach((text) =>
          Effect.sync(() => {
            const scrollTop = view.scrollDOM.scrollTop;
            // view.scrollDOM.classList.add('cm-hide-scrollbar');
            view.dispatch({
              changes: [{ from: view.state.doc.length, insert: text }],
              annotations: Transaction.remote.of(true),
              scrollIntoView: false,
            });

            // Prevent autoscrolling.
            requestAnimationFrame(() => {
              view.scrollDOM.scrollTop = scrollTop;
              // view.scrollDOM.classList.remove('cm-hide-scrollbar');
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
            effects: scrollToBottomEffect.of(null),
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
          view.dispatch({
            effects: [xmlTagContextEffect.of(null), xmlTagResetEffect.of(null)],
            changes: [{ from: 0, to: view.state.doc.length, insert: text }],
          });

          // New queue.
          const queue = Effect.runSync(Queue.unbounded<string>());
          setQueue(queue);
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

    // Widget events.
    useEffect(() => {
      if (!parentRef.current) {
        return;
      }

      return addEventListener(parentRef.current, 'click', (ev) => {
        const button = (ev.target as HTMLElement).closest('[data-action="submit"]');
        if (button?.getAttribute('data-action') === 'submit') {
          onEvent?.({
            type: 'submit',
            value: button.getAttribute('data-value'),
          });
        }
      });
    }, [view, onEvent]);

    // Cleanup.
    useEffect(() => {
      return () => {
        view?.destroy();
      };
    }, [view]);

    return (
      <>
        <div ref={parentRef} className={mx('bs-full is-full overflow-hidden', classNames)} />
        <ErrorBoundary>
          {widgets.map(({ Component, root, id, props }) => (
            <div key={id}>{createPortal(<Component {...props} />, root)}</div>
          ))}
        </ErrorBoundary>
      </>
    );
  },
);

class ErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
