//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client } from '@dxos/client';
import { FunctionType } from '@dxos/plugin-script';
import { create } from '@dxos/react-client/echo';

import { FunctionManager } from './functions';
import { ComputeGraphRegistry } from '../graph';

describe('FunctionManager', () => {
  test('map functions', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();

    // Create script.
    // TODO(burdon): Test after initialize.
    const space = await client.spaces.create();
    const fn = space.db.add(create(FunctionType, { version: 1, binding: 'HELLO' }));

    const registry = new ComputeGraphRegistry();
    await registry.initialize();

    const graph = await registry.createGraph(space);
    const functionManager = new FunctionManager(graph, space);

    const id = functionManager.mapFunctionBindingToId('HELLO()');
    expect(id).to.eq(`${fn.id}()`);

    // TODO(burdon): Test invocation.
    // TODO(burdon): Test storage.
  });
});
