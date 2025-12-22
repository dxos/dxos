//
// Copyright 2025 DXOS.org
//

import { EditorSelection, Transaction } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';
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
import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { type ThemedClassName, useDynamicRef, useStateWithRef } from '@dxos/react-ui';
import { useThemeContext } from '@dxos/react-ui';
import {
  type AutoScrollOptions,
  type StreamerOptions,
  type XmlTagsOptions,
  type XmlWidgetState,
  type XmlWidgetStateManager,
  autoScroll,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  extendedMarkdown,
  navigateNextEffect,
  navigatePreviousEffect,
  preview,
  scrollToBottomEffect,
  smoothScroll,
  streamer,
  useTextEditor,
  xmlTagContextEffect,
  xmlTagResetEffect,
  xmlTagUpdateEffect,
  xmlTags,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { createStreamer } from './stream';

export interface MarkdownStreamController extends XmlWidgetStateManager {
  get view(): EditorView | null;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  setContext: (context: any) => void;
  reset: (text: string) => Promise<void>;
  append: (text: string) => Promise<void>;
}

export type MarkdownStreamEvent = {
  type: 'submit';
  value: string | null;
};

export type MarkdownStreamProps = ThemedClassName<
  {
    debug?: boolean;
    content?: string;
    onEvent?: (event: MarkdownStreamEvent) => void;
  } & (XmlTagsOptions & StreamerOptions & AutoScrollOptions)
>;

export const MarkdownStream = forwardRef<MarkdownStreamController | null, MarkdownStreamProps>(
  ({ classNames, debug, content, registry, fadeIn, cursor, onEvent }, forwardedRef) => {
    const { themeMode } = useThemeContext();

    // Active widgets.
    const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);

    // Editor.
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
                className: 'size-container pli-cardSpacingInline',
              },
            },
          }),
          createBasicExtensions({ lineWrapping: true, readOnly: true, scrollPastEnd: true }),
          extendedMarkdown({ registry }),
          smoothScroll(),
          debug
            ? []
            : [
                decorateMarkdown({
                  skip: (node) => (node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:'),
                }),
                preview(),
                xmlTags({ registry, setWidgets, bookmarks: ['prompt'] }),
                streamer({ cursor, fadeIn }),
                autoScroll({ autoScroll: false }),
              ],
        ].filter(isNonNullable),
      };
    }, [debug, themeMode, registry]);

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
            view.dispatch({
              changes: [{ from: view.state.doc.length, insert: text }],
              annotations: Transaction.remote.of(true),
              scrollIntoView: false,
            });

            // Prevent autoscrolling.
            requestAnimationFrame(() => {
              view.scrollDOM.scrollTop = scrollTop;
            });
          }),
        ),
        Effect.runFork,
      );

      return () => {
        void runAndForwardErrors(Fiber.interrupt(fork));
      };
    }, [view, queue]);

    // Expose controller as API.
    const viewRef = useDynamicRef(view);
    useImperativeHandle(forwardedRef, () => {
      return {
        get view() {
          return viewRef.current;
        },
        scrollToBottom: (behavior?: ScrollBehavior) => {
          viewRef.current?.dispatch({
            effects: scrollToBottomEffect.of(behavior),
          });
        },
        navigatePrevious: () => {
          viewRef.current?.dispatch({
            effects: navigatePreviousEffect.of(),
          });
        },
        navigateNext: () => {
          viewRef.current?.dispatch({
            effects: navigateNextEffect.of(),
          });
        },
        // Set the context for XML tags.
        setContext: (context: any) => {
          viewRef.current?.dispatch({
            effects: xmlTagContextEffect.of(context),
          });
        },
        // Reset document.
        reset: async (text: string) => {
          viewRef.current?.dispatch({
            effects: [xmlTagContextEffect.of(null), xmlTagResetEffect.of(null)],
            changes: [{ from: 0, to: viewRef.current?.state.doc.length ?? 0, insert: text }],
          });

          // New queue.
          const queue = Effect.runSync(Queue.unbounded<string>());
          setQueue(queue);
        },
        // Append to queue (and stream).
        append: async (text: string) => {
          if (text.length) {
            await runAndForwardErrors(Queue.offer(queueRef.current, text));
          }
        },
        // Update widget.
        updateWidget: (id: string, value: any) => {
          viewRef.current?.dispatch({
            effects: xmlTagUpdateEffect.of({ id, value }),
          });
        },
      } satisfies MarkdownStreamController;
    }, []);

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
        {/* Markdown editor. */}
        <div ref={parentRef} className={mx('bs-full is-full overflow-hidden', classNames)} />

        {/* React widgets are rendered in portals outside of the editor. */}
        <ErrorBoundary>
          {widgets.map(({ Component, root, id, props }) => (
            <div key={id}>{createPortal(<Component view={view} {...props} />, root)}</div>
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
    log.catch(error, info);
  }

  override render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
