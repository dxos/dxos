//
// Copyright 2024 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { Client } from '@dxos/client';
import { create } from '@dxos/client/echo';
import { FunctionType } from '@dxos/plugin-script/types';

import { FunctionManager } from './function-manager';
import { ComputeGraphRegistry } from '../graph';

// TODO(burdon): Failing test infrastructure
//  - no docs? esp. needed for config. need pristine example package?
//    - for non browser tests, import types from x-plugin/types (otherwise will bring in react deps).
//  - can't add flags to our tools?
//  - .only / .skip ignored (have to comment out tests)
//  - Cannot test Hyperformula
//    - throws "Cannot convert undefined or null to object" in vitest (no browser).
//    - throws "process.nextTick is not a function" (if browser)

describe('FunctionManager', () => {
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
    const functionManager = new FunctionManager(graph, space);
    const id = functionManager.mapFunctionBindingToId('TEST()');
    expect(id).to.eq(`${fn.id}()`);
  });
});
