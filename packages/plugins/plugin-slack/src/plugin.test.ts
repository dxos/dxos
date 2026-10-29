//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';

import * as SlackPlugin from '#meta';

import { SlackNamespace } from './namespace.ts';

await Harness.preload({
  plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), ThreadPlugin.make(), SlackPlugin.make()],
});

const moduleId = (name: string) => `${SlackNamespace.key}.module.${name}`;

describe('SlackPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), ThreadPlugin.make(), SlackPlugin.make()],
    });

    // The modules are dependency-mode with no requires, so they activate in the
    // startup wave without waiting on any legacy ordering event.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('SlackConnector'),
        moduleId('OperationHandler'),
        moduleId('SlackChannelBackend'),
      ]),
    );
  }, 30_000);
});
