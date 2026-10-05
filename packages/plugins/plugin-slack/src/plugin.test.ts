//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';

import { meta } from '#meta';
import { SlackPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SlackPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), ThreadPlugin.make(), SlackPlugin()],
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
