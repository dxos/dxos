//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { createTestApp } from '@dxos/app-framework/testing';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';

import * as MermaidPlugin from '#meta';

const moduleId = (name: string) => `${MermaidPlugin.meta.profile.key}.module.${name}`;

describe('MermaidPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly — only ProcessManagerPlugin is needed.
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin.make(), MermaidPlugin.make()],
    });

    // MarkdownExtension is a cross-plugin contribution riding the markdown feature's start
    // event, which the harness does not fire here since MarkdownPlugin is not registered.
    expect(harness.manager.getActive()).not.toContain(moduleId('MarkdownExtension'));

    await harness.fire(MarkdownEvents.Start);
    expect(harness.manager.getActive()).toContain(moduleId('MarkdownExtension'));
  });
});
