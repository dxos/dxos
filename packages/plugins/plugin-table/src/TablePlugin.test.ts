//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { TablePlugin } from './TablePlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('TablePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface imports browser-only deps.
    // on-space-created and on-schema-added need SpaceEvents (not fired in tests).
    await using harness = await createComposerTestApp({
      plugins: [TablePlugin()],
      autoStart: false,
    });

    // BlueprintDefinition fires when AssistantPlugin loads blueprint definitions.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // OperationHandler fires lazily when an operation is invoked.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('BlueprintDefinition'), moduleId('OperationHandler')]),
    );
  });
});
