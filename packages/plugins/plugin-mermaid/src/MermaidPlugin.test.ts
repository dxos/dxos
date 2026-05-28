//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { DXN } from '@dxos/keys';
import { MarkdownEvents } from '@dxos/plugin-markdown';

import { MermaidPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('MermaidPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly — only ProcessManagerPlugin and ProcessManagerPlugin are needed.
    // MermaidPlugin has no surface module so SetupReactSurface firing harmlessly is fine.
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), MermaidPlugin()],
    });

    // The markdown module activates on MarkdownEvents.SetupExtensions,
    // which is fired by MarkdownPlugin before its ReactSurface activates.
    await harness.fire(MarkdownEvents.SetupExtensions);
    expect(harness.manager.getActive()).toContain(moduleId('markdown'));
  });
});
