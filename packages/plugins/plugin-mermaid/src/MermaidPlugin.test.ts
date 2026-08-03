//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import * as MarkdownEvents from '@dxos/plugin-markdown/MarkdownEvents';

import { MermaidPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('MermaidPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly — only ProcessManagerPlugin is needed.
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), MermaidPlugin()],
    });

    // MarkdownExtension is a cross-plugin contribution riding the markdown feature's start
    // event, which the harness does not fire here since MarkdownPlugin is not registered.
    expect(harness.manager.getActive()).not.toContain(moduleId('MarkdownExtension'));

    await harness.fire(MarkdownEvents.Start);
    expect(harness.manager.getActive()).toContain(moduleId('MarkdownExtension'));
  });
});
