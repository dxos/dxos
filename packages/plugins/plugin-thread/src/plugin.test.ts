//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as ThreadPlugin from '#meta';

import { ThreadNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), ThreadPlugin.make()] });

const moduleId = (name: string) => `${ThreadNamespace.key}.module.${name}`;

describe('ThreadPlugin', () => {
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), ThreadPlugin.make()],
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
