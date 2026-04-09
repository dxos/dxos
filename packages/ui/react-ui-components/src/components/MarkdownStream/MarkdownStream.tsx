//
// Copyright 2025 DXOS.org
//

import { EditorSelection, Extension, Transaction } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { addEventListener } from '@dxos/async';
import { runAndForwardErrors } from '@dxos/effect';
import { ErrorBoundary, type ThemedClassName, useDynamicRef, useStateWithRef, useThemeContext } from '@dxos/react-ui';
import { useTextEditor, type UseTextEditor } from '@dxos/react-ui-editor';
import {
  type AutoScrollProps,
  type XmlTagsOptions,
  type XmlWidgetState,
  type XmlWidgetStateManager,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  extendedMarkdown,
  navigateNextEffect,
  navigatePreviousEffect,
  preview,
  scrollToLine,
  scroller,
  scrollerLineEffect,
  fader,
  wire,
  wireBypass,
  xmlTagContextEffect,
  xmlTagResetEffect,
  xmlTagUpdateEffect,
  xmlTags,
  autoScroll,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { createStreamer } from './stream';

export interface MarkdownStreamController extends XmlWidgetStateManager {
  get length(): number | undefined;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  setContext: (context: any) => void;
  setContent: (text: string) => Promise<void>;
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
    options?: {
      autoScroll?: boolean;
      wire?: boolean;
      cursor?: boolean;
      fader?: boolean;
    };
    onEvent?: (event: MarkdownStreamEvent) => void;
  } & (XmlTagsOptions & AutoScrollProps)
>;

/**
 * Codemirror-based markdown editor with xml tag widtgets and streaming support.
 */
export const MarkdownStream = forwardRef<MarkdownStreamController | null, MarkdownStreamProps>(
  ({ classNames, debug, content, options, registry, onEvent }, forwardedRef) => {
    // Store current content so that we can toggle debug mode.
    const contentRef = useRef(content);

    // Editor.
    const { parentRef, view, viewRef, widgets } = useMarkdownStreamTextEditor(contentRef, {
      debug,
      registry,
      options,
    });

    // Streaming queue.
    const [queue, setQueue, queueRef] = useStateWithRef(Effect.runSync(Queue.unbounded<string>()));

    // Reset document.
    const onReset = useCallback(
      async (text: string) => {
        contentRef.current = text;
        if (!viewRef.current) {
          return;
        }

        // Set content and scroll to bottom.
        viewRef.current.dispatch({
          effects: [xmlTagContextEffect.of(null), xmlTagResetEffect.of(null)],
          changes: [{ from: 0, to: viewRef.current.state.doc.length, insert: text }],
          annotations: wireBypass.of(true),
          selection: EditorSelection.cursor(text.length),
        });

        scrollToLine(viewRef.current, { line: -1, behavior: 'instant' });

        // New queue.
        setQueue(Effect.runSync(Queue.unbounded<string>()));
      },
      [contentRef, viewRef, setQueue],
    );

    // Controller API.
    useImperativeHandle(
      forwardedRef,
      () => createMarkdownStreamController({ contentRef, viewRef, queueRef, onReset }),
      [onReset],
    );

    // Widget events.
    useEffect(() => {
      if (!parentRef.current) {
        return;
      }

      // TODO(burdon): This is a hack?
      return addEventListener(parentRef.current, 'click', (event) => {
        const button = (event.target as HTMLElement).closest('[data-action="submit"]');
        if (button?.getAttribute('data-action') === 'submit') {
          onEvent?.({
            type: 'submit',
            value: button.getAttribute('data-value'),
          });
        }
      });
    }, [view, parentRef, onEvent]);

    // Consume queue and update document.
    useMarkdownStreamQueue(view, queue);

    // Cleanup.
    useEffect(() => {
      return () => {
        view?.destroy();
      };
    }, [view]);

    return (
      <>
        {/* Markdown editor. */}
        <div role='none' className={mx('dx-container', classNames)} ref={parentRef} />

        {/* React widgets are rendered in portals outside of the editor. */}
        <ErrorBoundary name='markdown-stream'>
          {widgets.map(({ Component, root, id, props }) => (
            <div key={id} role='none'>
              {createPortal(<Component view={view} {...props} />, root)}
            </div>
          ))}
        </ErrorBoundary>
      </>
    );
  },
);

type MarkdownStreamTextEditorParams = Pick<MarkdownStreamProps, 'debug' | 'registry' | 'options'>;

type MarkdownStreamTextEditorResult = UseTextEditor & {
  viewRef: RefObject<EditorView | null>;
  widgets: XmlWidgetState[];
};

/**
 * Read-only markdown editor configured for streaming (theme, markdown extensions, XML widgets).
 */
const useMarkdownStreamTextEditor = (
  currentContent: RefObject<string | undefined>,
  { debug, registry, options }: MarkdownStreamTextEditorParams,
): MarkdownStreamTextEditorResult => {
  const { themeMode } = useThemeContext();

  // Active widgets.
  const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);

  // Editor.
  const editor = useTextEditor(() => {
    const content = currentContent.current;
    const streamingExtensions: Extension[] = debug
      ? []
      : [
          decorateMarkdown({
            skip: (node) => (node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:'),
          }),
          preview(),
          xmlTags({ registry, setWidgets, bookmarks: ['prompt'] }),
          ...(options?.autoScroll ? [autoScroll()] : []),
          ...(options?.wire ? [wire({ rate: 200, cursor: options?.cursor })] : []),
          ...(options?.fader ? [fader()] : []),
        ];

    return {
      initialValue: content,
      selection: EditorSelection.cursor(content?.length ?? 0),
      extensions: [
        createThemeExtensions({
          themeMode,
          syntaxHighlighting: true,
          slots: {
            scroll: {
              // NOTE: Child widgets must have `max-w-[100cqi]`.
              className: 'dx-size-container p-form-padding',
            },
          },
        }),
        createBasicExtensions({ lineWrapping: true, readOnly: true, scrollPastEnd: false }),
        extendedMarkdown({ registry }),
        scroller({ overScroll: 64 }),
        ...streamingExtensions,
      ],
    };
  }, [themeMode, registry, debug]);

  const viewRef = useDynamicRef(editor.view);
  return { ...editor, viewRef, widgets };
};

/**
 * Consumes streaming text from the queue and appends it to the editor document.
 */
const useMarkdownStreamQueue = (view: EditorView | null, queue: Queue.Queue<string>) => {
  useEffect(() => {
    if (!view) {
      return;
    }

    // Consume queue and update document.
    const fork = Stream.fromQueue(queue).pipe(
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
};

type MarkdownStreamControllerDeps = {
  contentRef: RefObject<string | undefined>;
  viewRef: RefObject<EditorView | null>;
  queueRef: RefObject<Queue.Queue<string>>;
  onReset: (text: string) => Promise<void>;
};

/**
 * External controller API.
 */
const createMarkdownStreamController = ({
  contentRef,
  viewRef,
  queueRef,
  onReset,
}: MarkdownStreamControllerDeps): MarkdownStreamController => {
  return {
    get length() {
      return viewRef.current?.state.doc.length;
    },

    /** Scroll to bottom. */
    scrollToBottom: (behavior?: ScrollBehavior) => {
      viewRef.current?.dispatch({
        effects: scrollerLineEffect.of({ line: -1, behavior }),
      });
    },

    /** Navigate previous prompt. */
    navigatePrevious: () => {
      viewRef.current?.dispatch({
        effects: navigatePreviousEffect.of(),
      });
    },

    /** Navigate next prompt. */
    navigateNext: () => {
      viewRef.current?.dispatch({
        effects: navigateNextEffect.of(),
      });
    },

    /** Set the context for widgets (XML tags). */
    setContext: (context: any) => {
      viewRef.current?.dispatch({
        effects: xmlTagContextEffect.of(context),
      });
    },

    /** Reset document. */
    setContent: onReset,

    /** Append to queue (and stream). */
    append: async (text: string) => {
      contentRef.current += text;
      if (viewRef.current?.state.doc.length === 0) {
        await onReset(text);
      } else if (text.length) {
        const queue = queueRef.current;
        if (queue) {
          await runAndForwardErrors(Queue.offer(queue, text));
        }
      }
    },

    /** Update widget state. */
    updateWidget: (id: string, value: any) => {
      viewRef.current?.dispatch({
        effects: xmlTagUpdateEffect.of({ id, value }),
      });
    },
  } satisfies MarkdownStreamController;
};
