//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppActivationEvents from '@dxos/app-toolkit/AppActivationEvents';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as GitHubPlugin from '#meta';
import { GitHubSkill } from '#skills';

import { GitHubNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), GitHubPlugin.make()] });

const moduleId = (name: string) => `${GitHubNamespace.key}.module.${name}`;

describe('GitHubPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), GitHubPlugin.make()],
    });

    // The harness fires every plugin's start event after startup, so both start-gated modules are active.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('GitHubConnector'), moduleId('OperationHandler')]),
    );
  }, 30_000);

  test('contributes the GitHub skill when the assistant starts', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), GitHubPlugin.make()],
    });

    await harness.fire(AppActivationEvents.AssistantStart);
    const definition = harness.getAll(AppCapabilities.SkillDefinition).find(({ key }) => key === GitHubSkill.key);
    expect(definition?.make().tools).toHaveLength(GitHubSkill.operations.length);
  }, 30_000);
});
