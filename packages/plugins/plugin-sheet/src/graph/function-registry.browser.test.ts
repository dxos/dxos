//
// Copyright 2024 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { Client } from '@dxos/client';
import { create } from '@dxos/client/echo';
import { FunctionType } from '@dxos/plugin-script/types';

import { FunctionRegistry } from './function-registry';
import { ComputeGraphRegistry } from '../graph';

// TODO(burdon): Vitest issues:
//  - Cannot test Hyperformula
//    - throws "Cannot convert undefined or null to object" in vitest (without browser).
//    - throws "process.nextTick is not a function" (with browser)
//    - throws "Buffer already defined" (if nodeExternal: true in config)
//  - Need better docs; esp. vitest config.
//    - NOTE: For non-browser tests, import types from x-plugin/types (otherwise will bring in react deps).
//  - Can't add flags to our tools?
//  - test.only / test.skip ignored?

describe('FunctionsRegistry', () => {
  test.only('map functions', async () => {
    const client = new Client();
    client.addTypes([FunctionType]);
    await client.initialize();
    await client.halo.createIdentity();

    // Create script.
    const space = await client.spaces.create();
    const fn = space.db.add(create(FunctionType, { version: 1, binding: 'TEST' }));

    const registry = new ComputeGraphRegistry();
    const graph = await registry.createGraph(space);
    const functions = new FunctionRegistry(graph, space);
    const id = functions.mapFunctionBindingToId('TEST()');
    expect(id).to.eq(`${fn.id}()`);
  });
});
