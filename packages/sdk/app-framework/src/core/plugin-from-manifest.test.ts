//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

import * as Plugin from './plugin.ts';

const KEY = DXN.make('com.example.operation.echo');

const Echo = Operation.make({ meta: { key: KEY }, input: Schema.String, output: Schema.String });

const manifest: Plugin.Manifest = {
  plugin: { key: 'com.example.plugin', name: 'Example' },
  modules: [
    {
      id: 'OperationHandler',
      requires: [],
      provides: [{ identifier: 'org.dxos.app-framework.capability.operationHandler', arity: 'multi' }],
      operations: { [KEY]: '/echo.mjs' },
    },
  ],
};

describe('Plugin.fromManifest', () => {
  test('an operations map lists keys and loads a handler only when it is resolved', async ({ expect }) => {
    let loads = 0;
    const { operations } = Plugin.fromManifest(manifest, {
      '/echo.mjs': () => {
        loads++;
        return Promise.resolve({ default: Echo.pipe(Operation.withHandler((input) => Effect.succeed(input))) });
      },
    });

    expect(operations.descriptors().map(({ key }) => key)).toEqual([KEY]);
    expect(loads).toEqual(0);

    const handler = await operations.getHandlerFor(KEY);
    expect(handler?.meta.key).toEqual(KEY);
    expect(loads).toEqual(1);
  });
});
