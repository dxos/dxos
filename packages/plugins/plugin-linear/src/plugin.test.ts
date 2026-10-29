//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as LinearPlugin from '#meta';

import { LinearNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), LinearPlugin.make()] });

const moduleId = (name: string) => `${LinearNamespace.key}.module.${name}`;

describe('LinearPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), ConnectorPlugin.make(), LinearPlugin.make()],
    });

    // The harness fires every plugin's start event after startup, so both start-gated modules are active.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('LinearConnector'), moduleId('OperationHandler')]),
    );
  }, 30_000);
});
