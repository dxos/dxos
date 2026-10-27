//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import * as FileSystemPlugin from '#meta';

import { FileSystemNamespace } from './namespace.ts';

await Harness.preload({ plugins: [FileSystemPlugin.make()] });

const moduleId = (name: string) => `${FileSystemNamespace.key}.module.${name}`;

describe('FileSystemPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [FileSystemPlugin.make()],
    });

    // State requires ClientCapabilities.Client (never provided here, no ClientPlugin) so it — and its
    // dependents AppGraphBuilder/ReactSurface — stay pending; the manager logs a structural
    // MissingProviderError but the plugin still activates. OperationHandler has no requires, so it's
    // active as a dependency-mode root regardless.
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
