//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { toCursorRange } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Doc } from '@dxos/echo-doc';
import { Text } from '@dxos/schema';

import { Markdown } from '#types';

import { getMarkdownAnchorText } from './anchor-resolver';

describe('getMarkdownAnchorText', () => {
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

  test('resolves an anchor to the spanned text', async ({ expect }) => {
    const { doc, accessor } = await setup('hello brave world');
    const anchor = toCursorRange(accessor, 6, 11);
    expect(getMarkdownAnchorText(doc, anchor)).toBe('brave');
  });

  test('returns undefined for a malformed anchor', async ({ expect }) => {
    const { doc } = await setup('hello');
    expect(getMarkdownAnchorText(doc, 'not-an-anchor')).toBeUndefined();
  });
});
