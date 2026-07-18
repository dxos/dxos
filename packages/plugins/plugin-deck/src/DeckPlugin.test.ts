//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DeckPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('DeckPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [DeckPlugin()],
    });

    // Both are dependency-mode roots (no requires), so they activate during the startup
    // dependency pass without waiting on any event.
    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
