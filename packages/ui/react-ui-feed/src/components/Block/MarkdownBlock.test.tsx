//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { EditorView } from '@codemirror/view';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, test } from 'vitest';

import { type XmlWidgetRegistry } from '@dxos/ui-editor';

import { MarkdownBlock, type MarkdownBlockProps } from './MarkdownBlock.tsx';

// React's act() warns unless the environment says it is a test.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const mount = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (props: MarkdownBlockProps) => act(() => root.render(<MarkdownBlock {...props} />));
  const text = () => EditorView.findFromDOM(container.querySelector<HTMLElement>('.cm-editor')!)?.state.doc.toString();
  return { container, root, render, text };
};

describe('MarkdownBlock', () => {
  const mounted: ReturnType<typeof mount>[] = [];
  afterEach(() => {
    for (const { root, container } of mounted.splice(0)) {
      act(() => root.unmount());
      container.remove();
    }
  });

  test('an append after the view is rebuilt lands at the end of the new document', async () => {
    const block = mount();
    mounted.push(block);
    const registry: XmlWidgetRegistry = {};
    await block.render({ text: 'The first reply, long enough to matter.' });
    await block.render({ text: 'The first reply, long enough to matter.', registry });
    await block.render({ text: 'The first reply, long enough to matter. And more.', registry });
    expect(block.text()).toBe('The first reply, long enough to matter. And more.');
  });

  test('text that arrives with a rebuild is in the new document', async () => {
    const block = mount();
    mounted.push(block);
    const registry: XmlWidgetRegistry = {};
    await block.render({ text: 'The first reply.' });
    await block.render({ text: 'The first reply. And more.', registry });
    expect(block.text()).toBe('The first reply. And more.');
  });

  // CodeMirror stores each line break as one character, so `\r\n` text must be measured the same way.
  test('CRLF text appends without running past the document', async () => {
    const block = mount();
    mounted.push(block);
    await block.render({ text: 'one\r\ntwo' });
    await block.render({ text: 'one\r\ntwo\r\nthree' });
    expect(block.text()).toBe('one\ntwo\nthree');
  });
});
