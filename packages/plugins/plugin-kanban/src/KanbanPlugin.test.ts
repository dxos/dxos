//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { KanbanPlugin } from './KanbanPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('KanbanPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface transitively imports @atlaskit CSS which breaks Node CJS transform.
    // on-space-created and on-schema-added need SpaceEvents (not fired in tests).
    await using harness = await createComposerTestApp({
      plugins: [KanbanPlugin()],
      autoStart: false,
    });

    // BlueprintDefinition fires when AssistantPlugin loads blueprint definitions.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // OperationHandler and UndoMappings both fire lazily on SetupOperationHandler.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('BlueprintDefinition'), moduleId('OperationHandler'), moduleId('UndoMappings')]),
    );
  });
});
