//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import { Markdown, MarkdownOperation } from '#types';

import * as MarkdownPlugin from './MarkdownPlugin.ts';

describe('MarkdownPlugin in workerd', () => {
  test('activates headless and contributes operations and types', async ({ expect }) => {
    const { failures, operationKeys, typenames } = await activateHeadlessPlugins([MarkdownPlugin.make()]);
    expect(failures).toEqual([]);
    expect(operationKeys).toContain(String(MarkdownOperation.Create.meta.key));
    expect(typenames).toContain(Type.getTypename(Markdown.Document));
  });
});
