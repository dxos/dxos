//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Plugin from '@dxos/app-framework/Plugin';
import { Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import descriptorUrl from '@dxos/plugin-markdown/dxplugin.jsonc';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { Markdown, MarkdownOperation } from '#types';

// Loaded once at module scope: a descriptor is data behind a URL, and the plugin arrays below
// are built synchronously.
const MarkdownPlugin = await EffectEx.runPromise(Plugin.loadManifest(descriptorUrl));

describe('CreateMarkdown', () => {
  test('returns an unpersisted document with the given name and content', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), MarkdownPlugin()],
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
      plugins: [ClientPlugin.make({}), MarkdownPlugin()],
    });

    const { object } = await harness.invoke(MarkdownOperation.CreateMarkdown, {});

    expect(Obj.instanceOf(Markdown.Document, object)).toBe(true);
    expect(object.name).toBeUndefined();
  });
});
