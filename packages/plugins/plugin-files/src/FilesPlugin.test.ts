//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { FilesPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('FilesPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [FilesPlugin()],
    });

    // After autoStart: AppGraphBuilder and OperationHandler auto-cascade.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('OperationHandler')]),
    );
  });
});
