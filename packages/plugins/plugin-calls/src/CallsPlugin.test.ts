//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { CallsPlugin } from '#plugin';

import { CallsPlugin as CallsPluginNode } from './CallsPlugin.node';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('CallsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), CallsPlugin()],
    });

    // The slim Call schema is registered on startup (headless/node variant).
    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
  });

  test('node variant registers schema module', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), CallsPluginNode()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
  });
});
