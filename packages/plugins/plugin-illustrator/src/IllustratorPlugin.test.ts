//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { IllustratorPlugin } from '#plugin';

import { Drawing } from './types';

describe('IllustratorPlugin', () => {
  // Canvas is written to the database by every variant's create flow, so the plugin that owns the
  // type must register it — registering it from a renderer plugin breaks the others when disabled.
  test('registers both the Drawing and Canvas schemas', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), IllustratorPlugin()],
    });

    const typenames = harness
      .getAll(AppCapabilities.Schema)
      .flat()
      .map((schema) => Type.getTypename(schema));
    expect(typenames).toEqual(
      expect.arrayContaining([Type.getTypename(Drawing.Drawing), Type.getTypename(Drawing.Canvas)]),
    );
  });
});
