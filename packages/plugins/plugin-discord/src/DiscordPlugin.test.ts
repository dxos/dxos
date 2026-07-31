//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DiscordPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('DiscordPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), ConnectorPlugin(), DiscordPlugin()],
    });

    // Both modules are dependency-mode with no requires, so they activate in the
    // startup wave without waiting on any legacy ordering event.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('DiscordConnector'), moduleId('OperationHandler')]),
    );
  }, 30_000);
});
