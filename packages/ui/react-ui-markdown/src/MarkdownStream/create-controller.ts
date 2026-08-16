//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import * as Queue from 'effect/Queue';
import { type RefObject } from 'react';

import { addEventListener } from '@dxos/async';
import { EffectEx } from '@dxos/effect';
import {
  crawlerLineEffect,
  navigateNextEffect,
  navigatePreviousEffect,
  xmlTagContextEffect,
  xmlTagUpdateEffect,
} from '@dxos/ui-editor';

import { type DocumentRange, type MarkdownStreamController } from './MarkdownStream';

// Kept out of `MarkdownStream.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * External controller API.
 *
 * @internal Exported for tests via `@dxos/react-ui-markdown/testing`; hosts get this through the
 * component's ref.
 */
export const computeVisibleRange = (view: EditorView): DocumentRange => {
  const rect = view.scrollDOM.getBoundingClientRect();
  // `posAtCoords(_, false)` clamps to the nearest position rather than returning null.
  const from = view.posAtCoords({ x: rect.left + 1, y: rect.top + 1 }, false);
  const to = view.posAtCoords({ x: rect.left + 1, y: rect.bottom - 1 }, false);
  return { from, to };
};

export type MarkdownStreamControllerDeps = {
  contentRef: RefObject<string | undefined>;
  viewRef: RefObject<EditorView | null>;
  queueRef: RefObject<Queue.Queue<string>>;
  /**
   * Holds a context set before the view existed, for {@link flushContext} to apply once it does.
   * Also re-applied after a document reset, which rebuilds decorations from a state without it.
   */
  pendingContextRef: RefObject<{ value: any } | undefined>;
  onReset: (text: string) => Promise<void>;
};

export const createMarkdownStreamController = ({
  contentRef,
  viewRef,
  queueRef,
  pendingContextRef,
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

    /** Scroll the given document position into view. */
    scrollTo: (pos: number, options?: { y?: 'start' | 'center' | 'end' | 'nearest' }) => {
      const view = viewRef.current;
      if (!view) {
        return;
      }

      const clamped = Math.max(0, Math.min(pos, view.state.doc.length));
      view.dispatch({ effects: EditorView.scrollIntoView(clamped, { y: options?.y ?? 'start' }) });
    },

    /** The document range currently visible in the viewport. */
    getVisibleRange: () => {
      const view = viewRef.current;
      return view ? computeVisibleRange(view) : undefined;
    },

    /** Subscribe to visible-range changes (scroll). Fires immediately with the current range. */
    onVisibleRangeChange: (cb: (range: DocumentRange) => void) => {
      const view = viewRef.current;
      if (!view) {
        return () => {};
      }
      const handler = () => cb(computeVisibleRange(view));
      handler();
      return addEventListener(view.scrollDOM, 'scroll', handler, { passive: true });
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

    /**
     * Set the context for widgets (XML tags).
     *
     * Remembered as well as dispatched: a host has no signal for when the view exists, and the
     * dispatch is a no-op before it does — so without this a context set on mount is silently lost and
     * every widget callback through it dies on an optional call. {@link flushContext} re-applies it.
     */
    setContext: (context: any) => {
      pendingContextRef.current = { value: context };
      viewRef.current?.dispatch({
        effects: xmlTagContextEffect.of(context),
      });
    },

    /** Re-applies the last context set, if any. Called once the view exists and after a reset. */
    flushContext: () => {
      const pending = pendingContextRef.current;
      if (pending && viewRef.current) {
        viewRef.current.dispatch({
          effects: xmlTagContextEffect.of(pending.value),
        });
      }
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
