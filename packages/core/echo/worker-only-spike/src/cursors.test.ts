//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@automerge/automerge', async (importOriginal) =>
  (await import('./mocks.ts')).automergeFactory(importOriginal),
);
vi.mock('@dxos/automerge-proxy/Automerge', async (importOriginal) =>
  (await import('./mocks.ts')).proxyNamespaceFactory(importOriginal),
);

// eslint-disable-next-line import/first
import * as Draft from '@dxos/automerge-proxy/Draft';
// eslint-disable-next-line import/first
import { getRangeFromCursor, getTextInAnchorRange, toCursorRange } from '@dxos/echo-client';

// eslint-disable-next-line import/first
import { SpikeHost } from './host.ts';
// eslint-disable-next-line import/first
import { leaks } from './namespace.ts';
// eslint-disable-next-line import/first
import { Network } from './network.ts';

describe('cursor consumers with no editor open', () => {
  test('anchors minted as text is written resolve in another tab, sort, and survive deletion as in Automerge', () => {
    leaks.length = 0;
    const host = new SpikeHost();
    host.create('doc', { content: 'Intro. Body text here. Outro.' });
    const network = new Network(host);
    const writer = network.open('doc');
    const reader = network.open('doc');
    const writerText = { handle: writer.handle, path: ['content'] as const };
    const readerText = { handle: reader.handle, path: ['content'] as const };

    // An AI edit inserts text and anchors a proposal on it at once, before the worker has seen it.
    writer.handle.change((doc: any) => Draft.splice(doc, ['content'], 7, 0, 'NEW PARAGRAPH. '));
    const anchors = [
      toCursorRange(writerText, 7, 20),
      toCursorRange(writerText, 0, 6),
      toCursorRange(writerText, 22, 31),
      toCursorRange(writerText, 36, 42),
    ];
    const texts = anchors.map((anchor) => getTextInAnchorRange(writerText, anchor));
    expect(texts[0]).toBe('NEW PARAGRAPH');

    // The reader has no editor and no replica; it resolves after the worker relays the edit.
    network.settle();
    const hostDoc = A.load<{ content: string }>(A.save(host.doc('doc')));
    const automergeRange = (anchor: string) => {
      const [from, to] = anchor.split(':');
      return {
        start: A.getCursorPosition(hostDoc, ['content'], from),
        end: to === 'end' ? hostDoc.content.length : A.getCursorPosition(hostDoc, ['content'], to),
      };
    };
    anchors.forEach((anchor, index) => {
      expect(getRangeFromCursor(readerText, anchor)).toEqual(automergeRange(anchor));
      expect(getTextInAnchorRange(readerText, anchor)).toBe(texts[index]);
    });

    // Anchor sort (plugin-markdown) orders by position, which needs every anchor resolved.
    const sorted = [...anchors].sort(
      (left, right) => getRangeFromCursor(readerText, left)!.start - getRangeFromCursor(readerText, right)!.start,
    );
    expect(sorted).toEqual(
      [...anchors].sort((left, right) => automergeRange(left).start - automergeRange(right).start),
    );

    // Deleting anchored text: the anchor collapses where Automerge collapses it, in both tabs.
    reader.handle.change((doc: any) => Draft.splice(doc, ['content'], 5, 17, ''));
    network.settle();
    const afterDelete = A.load<{ content: string }>(A.save(host.doc('doc')));
    for (const anchor of anchors) {
      const [from, to] = anchor.split(':');
      const want = {
        start: A.getCursorPosition(afterDelete, ['content'], from),
        end: to === 'end' ? afterDelete.content.length : A.getCursorPosition(afterDelete, ['content'], to),
      };
      expect(getRangeFromCursor(readerText, anchor)).toEqual(want);
      expect(getRangeFromCursor(writerText, anchor)).toEqual(want);
    }
    expect(leaks).toEqual([]);
  });
});
