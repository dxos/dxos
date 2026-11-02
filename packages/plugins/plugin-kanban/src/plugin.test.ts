//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import * as KanbanPlugin from '#meta';

import { KanbanNamespace } from './namespace.ts';

await Harness.preload({ plugins: [KanbanPlugin.make()] });

const moduleId = (name: string) => `${KanbanNamespace.key}.module.${name}`;

describe('KanbanPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [KanbanPlugin.make()],
    });

    // The harness fires every plugin's start event after startup, so both start-gated modules are active.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('OperationHandler'), moduleId('UndoMappings')]),
    );
  });
});
