//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { MarkdownEvents } from '@dxos/plugin-markdown';

import { MermaidPlugin } from './MermaidPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('MermaidPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly — only RuntimePlugin and OperationPlugin are needed.
    await using harness = await createTestApp({
      plugins: [OperationPlugin(), RuntimePlugin(), MermaidPlugin()],
      autoStart: false,
    });

    // The markdown module activates on MarkdownEvents.SetupExtensions,
    // which is fired by MarkdownPlugin before its ReactSurface activates.
    await harness.fire(MarkdownEvents.SetupExtensions);
    expect(harness.manager.getActive()).toContain(moduleId('markdown'));
  });
});
