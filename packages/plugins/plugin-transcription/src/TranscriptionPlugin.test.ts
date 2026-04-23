//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
// Use the CLI variant — the main ClientPlugin references capabilities that resolve to undefined under Node.
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { TranscriptionPlugin } from './TranscriptionPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('TranscriptionPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: the transcription module calls URL.createObjectURL on Startup, which is not available in Node.
    // Fire only the safe events needed to verify metadata, schema, blueprint, and operation handler modules.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), TranscriptionPlugin()],
      autoStart: false,
    });

    await harness.fire(AppActivationEvents.SetupMetadata);
    await harness.fire(AppActivationEvents.SetupSchema);

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('metadata'), moduleId('schema')]),
    );

    // SetupArtifactDefinition is fired by AssistantPlugin, which can't be included here due to a workspace cycle.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // SetupOperationHandler is fired by OperationPlugin on Startup.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
