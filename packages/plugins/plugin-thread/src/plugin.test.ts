//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from '#meta';
import { ThreadPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ThreadPlugin', () => {
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), ThreadPlugin()],
    });

    // After autoStart: schema and OperationHandler auto-cascade. `CreateObject` is browser-only —
    // its `CreateObjectEntry` carries a `customPanel` React component — so the node variant this
    // test resolves does not contribute it.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
    expect(harness.manager.getActive()).not.toContain(moduleId('CreateObject'));
  });
});
