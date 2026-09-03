//
// Copyright 2026 DXOS.org
//

// @vitest-environment jsdom

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import { describe, test } from 'vitest';

import {
  type XmlWidgetDef,
  decorationSetToArray,
  extendedMarkdown,
  xmlTagContextEffect,
  xmlTags,
} from '@dxos/ui-editor';

import { createMarkdownStreamController } from './create-controller.ts';

/**
 * The host↔editor seam: a host mounts the controller and publishes the context widgets call back
 * through, but the controller's dispatches are no-ops until the editor view exists — and the host has no
 * signal for when that is. These pin the contract that a context set at any point still reaches widgets.
 */
describe('MarkdownStreamController context', () => {
  test('a context set before the view exists is applied once it does', ({ expect }) => {
    const harness = createHarness();
    const context = { rewind: () => {} };

    // No view yet — this is what a host mounting the controller in an effect actually does.
    harness.controller.setContext(context);
    expect(harness.widgetContext()).toBeUndefined();

    harness.attachView();
    harness.controller.flushContext();
    expect(harness.widgetContext()).toBe(context);
  });

  test('a context set after the view exists is applied immediately', ({ expect }) => {
    const harness = createHarness();
    harness.attachView();

    const context = { rewind: () => {} };
    harness.controller.setContext(context);
    expect(harness.widgetContext()).toBe(context);
  });

  test('flushContext is a no-op when no context was set', ({ expect }) => {
    const harness = createHarness();
    harness.attachView();

    harness.controller.flushContext();
    expect(harness.widgetContext()).toBeUndefined();
  });

  // `setContent` resets the document and rebuilds decorations, which used to clear the context — the
  // context belongs to the host, not the document, so it has to survive.
  test('the context survives a document reset', async ({ expect }) => {
    const harness = createHarness();
    harness.attachView();

    const context = { rewind: () => {} };
    harness.controller.setContext(context);
    await harness.controller.setContent('<branch id="b" />');

    expect(harness.widgetContext('b')).toBe(context);
  });

  test('the latest context wins', ({ expect }) => {
    const harness = createHarness();
    harness.attachView();

    const first = { rewind: () => {} };
    const second = { rewind: () => {} };
    harness.controller.setContext(first);
    harness.controller.setContext(second);
    expect(harness.widgetContext()).toBe(second);
  });
});

const registry: Record<string, XmlWidgetDef> = {
  branch: { block: true, Component: () => null },
};

/**
 * Mirrors how `MarkdownStream` wires the controller: refs the host holds, a view created later, and
 * `onReset` replacing the document while re-asserting the host context.
 */
const createHarness = () => {
  const contentRef = { current: '<branch id="a" />' };
  const viewRef: { current: EditorView | null } = { current: null };
  const queueRef = { current: Effect.runSync(Queue.unbounded<string>()) };
  const pendingContextRef: { current: { value: any } | undefined } = { current: undefined };

  const controller = createMarkdownStreamController({
    contentRef,
    viewRef,
    queueRef,
    pendingContextRef,
    onReset: async (text) => {
      contentRef.current = text;
      viewRef.current?.dispatch({
        effects: [xmlTagContextEffect.of(pendingContextRef.current?.value ?? null)],
        changes: [{ from: 0, to: viewRef.current.state.doc.length, insert: text }],
      });
    },
  });

  return {
    controller,
    attachView: () => {
      viewRef.current = new EditorView({
        state: EditorState.create({
          doc: contentRef.current,
          extensions: [extendedMarkdown({ registry }), xmlTags({ registry })],
        }),
        parent: document.createElement('div'),
      });
    },
    /** The `context` prop the named widget's decoration was built with. */
    widgetContext: (id = 'a') => {
      const view = viewRef.current;
      if (!view) {
        return undefined;
      }
      for (const source of view.state.facet(EditorView.decorations)) {
        const set = typeof source === 'function' ? source(view) : source;
        if (!set) {
          continue;
        }
        for (const { value } of decorationSetToArray(set)) {
          const widget = value.spec?.widget;
          if (widget?.id === id) {
            return widget.props?.context;
          }
        }
      }
    },
  };
};
