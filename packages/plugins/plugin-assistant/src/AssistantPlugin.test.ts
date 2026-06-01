//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { ServiceResolver } from '@dxos/compute';
import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { AssistantPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('AssistantPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), AssistantPlugin()],
    });

    // After autoStart: AppGraphBuilder, CreateObject, schema, OperationHandler all auto-cascade.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('CreateObject'), moduleId('schema')]),
    );

    // AssistantPlugin fires SetupArtifactDefinition itself, so it can test its own blueprint.
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // OperationHandler auto-cascades from ProcessManagerPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));

    // AiService module must activate on SetupProcessManager (before the process manager is built).
    expect(harness.manager.getActive()).toContain(moduleId('AiService'));

    // AiService must be resolvable via the process manager's ServiceResolver.
    await harness.runPromise(
      Effect.gen(function* () {
        const aiService = yield* AiService.AiService;
        expect(aiService).toBeDefined();
      }).pipe(Effect.provide(ServiceResolver.provide({}, AiService.AiService))),
    );
  });
});
