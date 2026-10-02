//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import { meta } from '#meta';
import { FileSystemPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('FileSystemPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [FileSystemPlugin()],
    });

    // State requires ClientCapabilities.Client (never provided here, no ClientPlugin) so it — and its
    // dependents AppGraphBuilder/ReactSurface — stay pending; the manager logs a structural
    // MissingProviderError but the plugin still activates. OperationHandler has no requires, so it's
    // active as a dependency-mode root regardless.
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
