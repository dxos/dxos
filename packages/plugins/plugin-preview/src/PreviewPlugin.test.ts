//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { PreviewPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('PreviewPlugin', () => {
  // Harness boot imports the client chunk on demand; vitest's transform makes that slow on
  // loaded runners, so the budget matches the other client-backed activation tests.
  test('modules activate on the expected events', { timeout: 30_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), PreviewPlugin()],
    });

    // After autoStart: schema auto-cascades from ClientPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
