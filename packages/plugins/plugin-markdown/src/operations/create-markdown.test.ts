//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { Markdown, MarkdownOperation } from '#types';

import * as MarkdownPlugin from '../MarkdownPlugin';

describe('CreateMarkdown', () => {
  test('returns an unpersisted document with the given name and content', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), MarkdownPlugin.make()],
    });

    const { object } = await harness.invoke(MarkdownOperation.CreateMarkdown, {
      name: 'Shopping list',
      content: '- milk',
    });

    expect(Obj.instanceOf(Markdown.Document, object)).toBe(true);
    expect(object.name).toBe('Shopping list');
  });

  test('name and content are both optional', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), MarkdownPlugin.make()],
    });

    const { object } = await harness.invoke(MarkdownOperation.CreateMarkdown, {});

    expect(Obj.instanceOf(Markdown.Document, object)).toBe(true);
    expect(object.name).toBeUndefined();
  });
});
