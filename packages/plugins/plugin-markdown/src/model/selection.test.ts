//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { toCursor, toCursorRange } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';

import { Markdown } from '#types';

import { getMarkdownAnchorText, getSelectionRanges } from './selection';

describe('selection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async (content: string) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Markdown.Document, Text.Text]);
    const doc = db.add(Markdown.make({ name: 'doc', content }));
    const target = await doc.content.load();
    return { doc, accessor: Doc.createAccessor(target, ['content']) };
  };

  describe('getMarkdownAnchorText', () => {
    test('resolves an anchor to the spanned text', async ({ expect }) => {
      const { doc, accessor } = await setup('hello brave world');
      const anchor = toCursorRange(accessor, 6, 11);
      expect(getMarkdownAnchorText(doc, anchor)).toBe('brave');
    });

    test('returns undefined for a malformed anchor', async ({ expect }) => {
      const { doc } = await setup('hello');
      expect(getMarkdownAnchorText(doc, 'not-an-anchor')).toBeUndefined();
    });

    test('returns undefined for an anchor with extra delimiters', async ({ expect }) => {
      const { doc, accessor } = await setup('hello brave world');
      const anchor = toCursorRange(accessor, 6, 11);
      expect(getMarkdownAnchorText(doc, `${anchor}:extra`)).toBeUndefined();
    });
  });

  describe('getSelectionRanges', () => {
    test('resolves a multi-range selection to anchor/text pairs', async ({ expect }) => {
      const { doc, accessor } = await setup('hello brave world');
      const first = { from: toCursor(accessor, 0), to: toCursor(accessor, 5) };
      const second = { from: toCursor(accessor, 12), to: toCursor(accessor, 17) };
      const ranges = getSelectionRanges(doc, { mode: 'multi-range', ranges: [first, second] });
      expect(ranges).toEqual([
        { anchor: `${first.from}:${first.to}`, text: 'hello' },
        { anchor: `${second.from}:${second.to}`, text: 'world' },
      ]);
    });

    test('drops a range that fails to resolve and keeps the rest', async ({ expect }) => {
      const { doc, accessor } = await setup('hello brave world');
      const valid = { from: toCursor(accessor, 6), to: toCursor(accessor, 11) };
      const ranges = getSelectionRanges(doc, {
        mode: 'multi-range',
        ranges: [{ from: 'bogus', to: 'cursor' }, valid],
      });
      expect(ranges).toEqual([{ anchor: `${valid.from}:${valid.to}`, text: 'brave' }]);
    });

    test('returns no ranges for an empty selection', async ({ expect }) => {
      const { doc } = await setup('hello');
      expect(getSelectionRanges(doc, undefined)).toEqual([]);
      expect(getSelectionRanges(doc, { mode: 'multi-range', ranges: [] })).toEqual([]);
    });
  });
});
