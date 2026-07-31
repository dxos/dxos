//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';

import { MermaidPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('MermaidPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly — only ProcessManagerPlugin is needed.
    // MermaidPlugin has no surface module so SetupReactSurface firing harmlessly is fine.
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), MermaidPlugin()],
    });

    // MarkdownExtension has no requires, so it activates at startup as a dependency-mode
    // root rather than waiting for MarkdownEvents.SetupExtensions.
    expect(harness.manager.getActive()).toContain(moduleId('MarkdownExtension'));
  });
});
