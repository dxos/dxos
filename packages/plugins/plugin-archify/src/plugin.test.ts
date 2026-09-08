//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ArchifyPlugin } from '#plugin';
import { Diagram } from '#types';

describe('ArchifyPlugin', () => {
  test('registers the Diagram schema', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), ArchifyPlugin()],
    });

    const typenames = harness
      .getAll(AppCapabilities.Schema)
      .flat()
      .map((schema) => Type.getTypename(schema));
    expect(typenames).toEqual(expect.arrayContaining([Type.getTypename(Diagram.Diagram)]));
  });
});
