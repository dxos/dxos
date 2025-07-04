//
// Copyright 2024 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { Client } from '@dxos/client';
import { Obj } from '@dxos/echo';
import { FunctionType } from '@dxos/functions';

// Part 2.
// TODO(burdon): Cannot test outside of browser.
//  - Cannot test Hyperformula
//    - throws "Cannot convert undefined or null to object" in vitest (no browser).
//    - throws "process.nextTick is not a function" (if browser)

// TODO(burdon): Fix test infrastructure:
//  - Need docs? esp. needed for config. need pristine example package?
//    - NOTE for non browser tests, import types from x-plugin/types (otherwise will bring in react deps).
//  - Can't add flags to our tools?
//  - .only / .skip ignored (have to comment out tests)

describe('test', () => {
  test('test', async () => {
    const client = new Client();
    client.addTypes([FunctionType]);
    await client.initialize();
    await client.halo.createIdentity();

    // Part 1.
    // Create script.
    // VITEST_ENV=chromium p test
    // TODO(burdon): Test after initialize.
    //  - ERROR "process.nextTick is not a function"
    //  - ERROR "Identifier 'Buffer' has already been declared" if { nodeExternal: true }
    const space = await client.spaces.create();
    const fn = space.db.add(Obj.make(FunctionType, { name: 'test', version: '0.0.1', binding: 'HELLO' }));
    expect(fn).to.exist;
  });
});
