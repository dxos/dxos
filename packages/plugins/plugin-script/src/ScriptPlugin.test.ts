//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { ScriptPlugin } from './ScriptPlugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('ScriptPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface imports browser-only deps that fail in Node.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), ScriptPlugin()],
      autoStart: false,
    });

    await harness.fire(ActivationEvents.Startup);

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('metadata'), moduleId('schema')]),
    );

    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));
  });
});
