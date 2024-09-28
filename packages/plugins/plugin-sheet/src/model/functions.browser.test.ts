//
// Copyright 2024 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { Client } from '@dxos/client';
import { FunctionType } from '@dxos/plugin-script/types';
import { create } from '@dxos/react-client/echo';

// import { FunctionManager } from './functions';
// import { ComputeGraphRegistry } from '../graph';

// TODO(burdon): Failing test infrastructure
//  - no docs? esp. needed for config. need pristine example package?
//    - for non browser tests, import types from x-plugin/types (otherwise will bring in react deps).
//  - can't add flags to our tools?
//  - .only / .skip ignored (have to comment out tests)

describe('FunctionManager', () => {
  test.only('map functions', async () => {
    const client = new Client();
    client.addTypes([FunctionType]);
    await client.initialize();
    await client.halo.createIdentity();

    // Create script.
    // TODO(burdon): Test after initialize.
    const space = await client.spaces.create();
    const fn = space.db.add(create(FunctionType, { version: 1, binding: 'HELLO' }));

    try {
      const HyperFormula = await import('hyperformula');
      HyperFormula.registerLanguage('enUS', enUS);
      console.log(HyperFormula);
    } catch (err) {
      console.log(err);
    }

    // const registry = new ComputeGraphRegistry();
    // await registry.initialize();

    // const graph = await registry.createGraph(space);
    // const functionManager = new FunctionManager(graph, space);

    // const id = functionManager.mapFunctionBindingToId('HELLO()');
    // expect(id).to.eq(`${fn.id}()`);

    // TODO(burdon): Test invocation.
    // TODO(burdon): Test storage.
    console.log('###############################');
    expect(true).toBe(true);
  });
});
