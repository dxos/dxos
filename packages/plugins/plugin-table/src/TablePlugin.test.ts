//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { TablePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('TablePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // on-space-created and on-schema-added need SpaceEvents (not fired in tests).
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), TablePlugin()],
    });

    // After autoStart: OperationHandler auto-cascades from ProcessManagerPlugin.
    // schema auto-cascades from ClientPlugin.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('OperationHandler'), moduleId('schema')]),
    );

    // BlueprintDefinition fires when AssistantPlugin loads blueprint definitions.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));
  });
});
