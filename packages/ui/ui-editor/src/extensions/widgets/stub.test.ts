//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { describe, test } from 'vitest';

import { StubWidget, type WidgetNotifier } from './stub.ts';

const notifier: WidgetNotifier = { mounted: () => {}, unmounted: () => {}, updated: () => {}, reconcile: () => {} };

const block = (id: string) =>
  new StubWidget({
    id,
    Component: () => null,
    props: { _tag: 'image', range: { from: 0, to: 0 } },
    notifier,
    block: true,
    keepAlive: true,
  });

describe('StubWidget', () => {
  test('takes over only its own placeholder, so two widgets never render into one', ({ expect }) => {
    const view = new EditorView({ parent: document.createElement('div') });
    const element = block('a').toDOM(view);
    expect(block('b').updateDOM(element, view)).toBe(false);
    expect(block('a').updateDOM(element, view)).toBe(true);
    view.destroy();
  });
});
