//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { KanbanPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('KanbanPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [KanbanPlugin()],
    });

    // After autoStart: OperationHandler and UndoMappings auto-cascade from ProcessManagerPlugin.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('OperationHandler'), moduleId('UndoMappings')]),
    );

    // SkillDefinition fires when AssistantPlugin loads skill definitions.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('SkillDefinition'));
  });
});
