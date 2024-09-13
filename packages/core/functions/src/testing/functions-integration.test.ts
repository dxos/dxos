//
// Copyright 2024 DXOS.org
//

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { create } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';

import { initFunctionsPlugin } from './plugin-init';
import { setTestCallHandler } from './test/handler';
import { createInitializedClients, inviteMember, startFunctionsHost, TestType } from '../testing';
import { FunctionDef, FunctionTrigger } from '../types';

// TODO(wittjosiah): Doesn't work in vitest.
describe.skip('functions e2e', () => {
  let testBuilder: TestBuilder;

  beforeAll(async () => {
    testBuilder = new TestBuilder();
  });

  afterAll(async () => {
    await testBuilder.destroy();
  });

  test('a function gets triggered in response to another peer object creations', async () => {
    // TODO(burdon): Create builder pattern.
    const functionRuntime = await startFunctionsHost(testBuilder, initFunctionsPlugin);

    const app = (await createInitializedClients(testBuilder, 1))[0];
    const space = await app.spaces.create();
    await inviteMember(space, functionRuntime.client);

    const uri = 'example.com/function/test';
    space.db.add(create(FunctionDef, { uri, route: '/test', handler: 'test' }));
    const triggerMeta: FunctionTrigger['meta'] = { name: 'DXOS' };
    space.db.add(
      create(FunctionTrigger, {
        function: uri,
        enabled: true,
        meta: triggerMeta,
        spec: {
          type: 'subscription',
          filter: [{ type: TestType.typename }],
        },
      }),
    );

    const called = new Trigger<any>();
    setTestCallHandler(async (args) => {
      called.wake(args.event.data);
      return args.response.status(200);
    });

    await functionRuntime.waitForActiveTriggers(space);
    const addedObject = space.db.add(create(TestType, { title: '42' }));

    const callArgs = await called.wait();
    expect(callArgs.meta).to.deep.eq(triggerMeta);
    expect(callArgs.objects).to.deep.eq([addedObject.id]);
    expect(callArgs.spaceKey).to.eq(space.key.toHex());
  });
});
