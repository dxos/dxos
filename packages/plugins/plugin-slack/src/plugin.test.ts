//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SlackPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SlackPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), SlackPlugin()],
    });

    // Both modules are dependency-mode with no requires, so they activate in the
    // startup wave without waiting on any legacy ordering event.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('SlackConnector'), moduleId('OperationHandler')]),
    );
  }, 30_000);
});
