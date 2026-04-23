//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
// Use the CLI variant — the main ClientPlugin references capabilities that resolve to undefined under Node.
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { VoxelPlugin } from './VoxelPlugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('VoxelPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), VoxelPlugin()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('metadata'), moduleId('schema'), moduleId('ReactSurface')]),
    );

    // SetupArtifactDefinition is fired by AssistantPlugin, which can't be included here due to a workspace cycle.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));
  });
});
