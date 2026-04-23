//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
// Use the CLI variant — the main ClientPlugin references capabilities that resolve to undefined under Node.
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ThreadPlugin } from './ThreadPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('ThreadPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface and ReactRoot import native 3D deps (GLSL shaders) that fail in Node.
    // Fire only the safe events needed to verify AppGraphBuilder, metadata, schema, blueprint, and operation handler.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), ThreadPlugin()],
      autoStart: false,
    });

    await harness.fire(AppActivationEvents.SetupAppGraph);
    await harness.fire(AppActivationEvents.SetupMetadata);
    await harness.fire(AppActivationEvents.SetupSchema);

    // Modules expected to be active (ReactSurface and ReactRoot excluded — browser-only).
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('AppGraphBuilder'),
        moduleId('metadata'),
        moduleId('schema'),
      ]),
    );

    // SetupArtifactDefinition is fired by AssistantPlugin, which can't be included here due to a workspace cycle.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // Operation handlers are not loaded on startup — SetupOperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('OperationHandler'), moduleId('UndoMappings')]),
    );
  });
});
