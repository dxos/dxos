//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
// Use the CLI variant — the main ClientPlugin references capabilities that resolve to undefined under Node.
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { AssistantPlugin } from './AssistantPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('AssistantPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), AssistantPlugin()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('metadata'), moduleId('schema'), moduleId('ReactSurface')]),
    );

    // AssistantPlugin fires SetupArtifactDefinition itself, so it can test its own blueprint.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // Operation handlers are not loaded on startup — SetupOperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
