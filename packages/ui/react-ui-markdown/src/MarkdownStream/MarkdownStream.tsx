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
  type ReactNode,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { addEventListener } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import { ErrorBoundary, type ThemedClassName, useDynamicRef, useStateWithRef, useThemeContext } from '@dxos/react-ui';
import { type UseTextEditor, useTextEditor } from '@dxos/react-ui-editor';
import {
  type AutoScrollProps,
  PROMPT_ELEMENT,
  ThemeExtensionsOptions,
  type XmlTagsOptions,
  type XmlWidgetState,
  type XmlWidgetStateManager,
  crawlerLineEffect,
  createBasicExtensions,
  createThemeExtensions,
  createTurnSource,
  decorateMarkdown,
  documentSlots,
  extendedMarkdown,
  fader,
  lineSpacing,
  navigateNextEffect,
  navigatePreviousEffect,
  scroller,
  turnFolding,
  typewriter,
  typewriterBypass,
  xmlBlockDecoration,
  xmlFormatting,
  xmlTagContextEffect,
  xmlTagResetEffect,
  xmlTags,
  xmlTagUpdateEffect,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { footer, setFooterVisibleEffect } from './footer';
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

    /**
     * Theme extensions.
     */
    slots?: ThemeExtensionsOptions['slots'];

    /** Event handler. */
    onEvent?: (event: MarkdownStreamEvent) => void;
  } & (XmlTagsOptions & AutoScrollProps)
>;

/**
 * Codemirror-based markdown editor with xml tag widtgets and streaming support.
 */
export const MarkdownStream = forwardRef<MarkdownStreamController | null, MarkdownStreamProps>(
  ({ classNames, debug, content, options, registry, extensions, footer, slots, onEvent }, forwardedRef) => {
    // Store current content so that we can toggle debug mode. Default to '' so the
    // `append()` path (which does `contentRef.current += text`) doesn't concatenate
    // against `undefined` and stamp `"undefined"` into the transcript snapshot.
    const contentRef = useRef(content ?? '');

    // DOM node for the footer block widget — populated when its decoration mounts.
    const [footerRoot, setFooterRoot] = useState<HTMLElement | null>(null);

    // Codemirror editor.
    const { parentRef, view, viewRef, widgets } = useMarkdownStreamTextEditor(contentRef, {
      slots,
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
        <div className={mx('dx-container', classNames)} ref={parentRef} />

        {/* React widgets are rendered in portals outside of the editor. */}
        <ErrorBoundary name='markdown-stream'>
          {widgets.map(({ Component, root, id, props }) => (
            <div key={id}>{createPortal(<Component view={view} {...props} />, root)}</div>
          ))}
          {footerRoot && footerVisible && createPortal(footer, footerRoot)}
        </ErrorBoundary>
      </>
    );
  },
);

// Fold each agent response beneath its `<prompt>` (the head element rendered by `xmlBlockDecoration`).
const turnSource = createTurnSource(PROMPT_ELEMENT);

type MarkdownStreamTextEditorParams = Pick<MarkdownStreamProps, 'debug' | 'registry' | 'options' | 'extensions'> &
  Pick<ThemeExtensionsOptions, 'slots'> & {
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
  {
    debug,
    registry,
    options,
    extensions: extensionsProp,
    slots = documentSlots,
    setFooterRoot,
  }: MarkdownStreamTextEditorParams,
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
        createBasicExtensions({ lineWrapping: true, readOnly: true }),
        createThemeExtensions({ slots, scrollbarThin: true, syntaxHighlighting: true, themeMode }),
        xmlFormatting({ skip: debug ? [] : ['prompt'] }),
        !debug &&
          [
            extendedMarkdown({ registry }),
            decorateMarkdown({
              // `echo:`/`dxn:` links/images are handled by the `link-preview` entry in the
              // registry via `xmlTags` `urlSchemes`. Skipping them here avoids `decorateMarkdown`
              // adding a non-functional `LinkButton` anchor on top of the same node.
              skip: (node) =>
                (node.name === 'Link' || node.name === 'Image') &&
                (node.url.startsWith('dxn:') || node.url.startsWith('echo:')),
            }),
            // TODO(burdon): Make optional; Removes need for '\n\n'.
            lineSpacing(),
            // NOTE: An ancestor element must set `data-hue` so `.dx-panel` resolves to the user's
            // hue tokens (see `packages/ui/ui-theme/src/css/components/panel.css`). Tailwind picks
            // up these utility classes from this source file.
            //
            // The bubble is styled at the line (block) level rather than as an inline mark so that
            // a multi-line prompt renders as one contiguous block with a continuous left band,
            // instead of a separate pill per visual line. `dx-panel` is used only for its
            // hue-aware `border-{hue}-border`; the fill and text are overridden to neutral surface
            // tokens (the panel's `text-neutral-900` only reads on a light hue fill), so colour
            // comes from the left border band rather than a strong background. Tailwind preflight
            // zeroes border widths, so the left border alone yields just the band. Keep the band
            // width (`border-l-[8px]`) and the left padding (`pl-[8px]!`) equal so content stays
            // flush against the band regardless of the chosen band thickness.
            xmlBlockDecoration({
              tag: 'prompt',
              lineClass:
                'cm-prompt-line cm-prompt-bubble dx-panel bg-group-surface text-base-fg border-l-[8px] pl-[8px]! pr-2 [&_*]:text-inherit!',
              firstLineClass: 'pt-1.5 rounded-t-sm',
              lastLineClass: 'pb-1.5 rounded-b-sm',
              hideTags: true,
            }),
            xmlTags({ registry, setWidgets, bookmarks: ['prompt'] }),
            turnFolding({ source: turnSource }),
            scroller({ overScroll: 80, autoScroll: options?.autoScroll }),
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
        extensionsProp,
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
    slots,
    extensionsProp,
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
      void EffectEx.runAndForwardErrors(Fiber.interrupt(fork));
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
        effects: crawlerLineEffect.of({ line: -1, behavior }),
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
          await EffectEx.runAndForwardErrors(Queue.offer(queue, text));
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
