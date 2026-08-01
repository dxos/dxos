//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { KanbanPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('KanbanPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [KanbanPlugin()],
    });

    // OperationHandler and UndoMappings are dependency-mode roots, so they activate immediately.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('OperationHandler'), moduleId('UndoMappings')]),
    );
  });
});
