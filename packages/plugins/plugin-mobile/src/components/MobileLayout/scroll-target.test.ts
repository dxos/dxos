//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { describeScrollTarget } from './scroll-target.ts';

describe('describeScrollTarget', () => {
  test('ignores the viewport scroll, whose target is the document itself', ({ expect }) => {
    const messages: (string | undefined)[] = [];
    const listener = (event: Event) => messages.push(describeScrollTarget(event.target));
    document.addEventListener('scroll', listener, { capture: true });
    // The viewport's scroll event targets the `Document`, which has no `classList`.
    document.dispatchEvent(new Event('scroll'));
    document.removeEventListener('scroll', listener, { capture: true });

    expect(messages).toEqual([undefined]);
  });

  test('ignores the scrolling roots', ({ expect }) => {
    expect(describeScrollTarget(document.documentElement)).toBeUndefined();
    expect(describeScrollTarget(document.body)).toBeUndefined();
  });

  test('describes a scrolling container', ({ expect }) => {
    const container = document.createElement('div');
    container.className = 'overflow-auto p-2 text-sm';
    document.body.appendChild(container);

    expect(describeScrollTarget(container)).toEqual('DIV.overflow-auto.p-2 top=0');
  });
});
