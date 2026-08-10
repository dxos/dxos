//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { NativeFilesystemPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('NativeFilesystemPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [NativeFilesystemPlugin()],
    });

    // State requires ClientCapabilities.Client (never provided here, no ClientPlugin) so it — and its
    // dependents AppGraphBuilder/ReactSurface — stay pending; the manager logs a structural
    // MissingProviderError but the plugin still activates. OperationHandler has no requires, so it's
    // active as a dependency-mode root regardless.
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
