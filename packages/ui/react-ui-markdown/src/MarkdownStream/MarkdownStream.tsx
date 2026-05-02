//
// Copyright 2025 DXOS.org
//

import { EditorSelection, type Extension, Transaction } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';
import React, {
  forwardRef,
  type ReactNode,
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
  scroller,
  scrollerLineEffect,
  fader,
  typewriter,
  typewriterBypass,
  xmlTagContextEffect,
  xmlTagResetEffect,
  xmlTagUpdateEffect,
  xmlTags,
  autoScroll,
  documentSlots,
  xmlFormatting,
  xmlBlockDecoration,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { setFooterVisibleEffect, footer } from './footer';
import { type StreamerOptions, createStreamer } from './stream';
export interface MarkdownStreamController extends XmlWidgetStateManager {
  get length(): number | undefined;
  focus: () => void;
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

    /** Initial content. */
    content?: string;

    /** View options. */
    options?: {
      autoScroll?: boolean;
      typewriter?: boolean;
      cursor?: boolean;
      fader?: boolean;

      /**
       * Streaming cadence. See {@link StreamerOptions}.
       * Use `'word'` or `'character'` to break large source chunks into smaller CM dispatches —
       * useful when the AI service emits big partial blocks but you want a smoother typewriter
       * effect. Combine with `streamDelayMs` to add a per-token sleep.
       * Default: `'span'` (one CM dispatch per source chunk; current behaviour).
       */
      streamCadence?: StreamerOptions['chunkSize'];

      /**
       * Per-token delay (ms) for the streaming queue. Default `0`.
       */
      streamDelayMs?: number;
    };

    /**
     * Optional React subtree rendered as a CodeMirror block-widget decoration anchored at
     * `doc.length`. Scrolls with the document content (lives inside `cm-content`'s flow).
     * Visibility tracks the truthiness of the prop.
     */
    footer?: ReactNode;

    /**
     * Extra CodeMirror extensions appended after the built-in stack — use for keymaps or
     * other host-level behaviour (e.g. `Mod-d` to toggle debug) that should apply when the
     * document is focused.
     */
    extensions?: Extension;

    /** Event handler. */
    onEvent?: (event: MarkdownStreamEvent) => void;
  } & (XmlTagsOptions & AutoScrollProps)
>;

/**
 * Codemirror-based markdown editor with xml tag widtgets and streaming support.
 */
export const MarkdownStream = forwardRef<MarkdownStreamController | null, MarkdownStreamProps>(
  ({ classNames, debug, content, options, registry, extensions, footer, onEvent }, forwardedRef) => {
    // Store current content so that we can toggle debug mode. Default to '' so the
    // `append()` path (which does `contentRef.current += text`) doesn't concatenate
    // against `undefined` and stamp `"undefined"` into the transcript snapshot.
    const contentRef = useRef(content ?? '');

    // DOM node for the footer block widget — populated when its decoration mounts.
    const [footerRoot, setFooterRoot] = useState<HTMLElement | null>(null);

    // Codemirror editor.
    const { parentRef, view, viewRef, widgets } = useMarkdownStreamTextEditor(contentRef, {
      debug,
      registry,
      options,
      extensions,
      setFooterRoot: footer ? setFooterRoot : undefined,
    });

    // Show the status footer.
    const footerVisible = !!footer;
    useEffect(() => {
      view?.dispatch({ effects: setFooterVisibleEffect.of(footerVisible) });
    }, [view, footerVisible]);

    // Streaming text queue.
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
          annotations: typewriterBypass.of(true),
          selection: EditorSelection.cursor(text.length),
        });

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

      // TODO(burdon): Replace this hack with a custom event listener from widgets.
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
    useMarkdownStreamQueue(view, queue, {
      chunkSize: options?.streamCadence,
      delayMs: options?.streamDelayMs,
    });

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
          {footerRoot && footerVisible && createPortal(footer, footerRoot)}
        </ErrorBoundary>
      </>
    );
  },
);

type MarkdownStreamTextEditorParams = Pick<MarkdownStreamProps, 'debug' | 'registry' | 'options' | 'extensions'> & {
  setFooterRoot?: (el: HTMLElement | null) => void;
};

type MarkdownStreamTextEditorResult = UseTextEditor & {
  viewRef: RefObject<EditorView | null>;
  widgets: XmlWidgetState[];
};

/**
 * Read-only markdown editor configured for streaming (theme, markdown extensions, XML widgets).
 */
const useMarkdownStreamTextEditor = (
  currentContent: RefObject<string | undefined>,
  { debug, registry, options, extensions: extraExtensions, setFooterRoot }: MarkdownStreamTextEditorParams,
): MarkdownStreamTextEditorResult => {
  const { themeMode } = useThemeContext();

  // Active widgets.
  const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);

  // Editor.
  const { view, parentRef } = useTextEditor(() => {
    const content = currentContent.current;
    return {
      initialValue: content,
      selection: EditorSelection.cursor(content?.length ?? 0),
      extensions: [
        createBasicExtensions({
          lineWrapping: true,
          readOnly: true,
        }),
        createThemeExtensions({
          slots: documentSlots,
          scrollbarThin: true,
          syntaxHighlighting: true,
          themeMode,
        }),
        !debug &&
          [
            extendedMarkdown({ registry }),
            decorateMarkdown({
              // `dxn:` links/images are reference widgets owned by `preview()` (PreviewInlineWidget /
              // PreviewBlockWidget). Skipping them here avoids `decorateMarkdown` adding a
              // non-functional `LinkButton` anchor on top of the same node — e.g. for
              // `[DXOS](dxn:echo:BNPMIBEDJLRIILYUYZVM6GT64VWI6WPPZ:01KQ889PZBRNHAEECV0ANFAYX7)`.
              skip: (node) => (node.name === 'Link' || node.name === 'Image') && node.url.startsWith('dxn:'),
            }),
            preview(),
            // NOTE: An ancestor element must set `data-hue` so `.dx-panel` resolves to the user's
            // hue tokens (see `packages/ui/ui-theme/src/css/components/panel.css`). Tailwind picks
            // up these utility classes from this source file.
            xmlBlockDecoration({
              tag: 'prompt',
              lineClass: 'cm-prompt-line my-8',
              contentClass: 'cm-prompt-bubble dx-panel px-2 py-1.5 rounded-sm [&_*]:text-inherit!',
              hideTags: true,
            }),
            xmlFormatting({ skip: ['prompt'] }),
            xmlTags({ registry, setWidgets, bookmarks: ['prompt'] }),
            scroller({ overScroll: 80 }),
            options?.autoScroll && autoScroll(),
            options?.typewriter &&
              typewriter({
                cursor: options?.cursor,
                streamingTags: new Set(
                  Object.entries(registry ?? {})
                    .filter(([, def]) => def.streaming)
                    .map(([tag]) => tag),
                ),
              }),
            options?.fader && fader(),
            setFooterRoot && footer(setFooterRoot),
          ].filter(isTruthy),
        extraExtensions,
      ].filter(isTruthy),
    };
  }, [
    themeMode,
    registry,
    debug,
    options?.autoScroll,
    options?.typewriter,
    options?.cursor,
    options?.fader,
    extraExtensions,
  ]);

  const viewRef = useDynamicRef(view);
  return { view, viewRef, parentRef, widgets };
};

/**
 * Consumes streaming text from the queue and appends it to the editor document.
 */
const useMarkdownStreamQueue = (
  view: EditorView | null,
  queue: Queue.Queue<string>,
  streamerOptions?: StreamerOptions,
) => {
  const chunkSize = streamerOptions?.chunkSize;
  const delayMs = streamerOptions?.delayMs;
  useEffect(() => {
    if (!view) {
      return;
    }

    // Consume queue and update document.
    const fork = Stream.fromQueue(queue).pipe(
      (source) => createStreamer(source, { chunkSize, delayMs }),
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
  }, [view, queue, chunkSize, delayMs]);
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

    /** Focus the editor. */
    focus: () => {
      viewRef.current?.focus();
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
      if (text.length) {
        // Always go through the streaming queue, even when the doc starts empty. Skipping the
        // queue in that case (via `onReset`) bypasses the `typewriter` extension's transaction filter
        // and the first chunk lands in one CM dispatch — defeating the typewriter for any
        // consumer (e.g. ChatThread) where the first delta is large because upstream batching
        // collected several streaming partials before React rendered.
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
