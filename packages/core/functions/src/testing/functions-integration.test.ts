//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { create } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { describe, test } from '@dxos/test';

import { initFunctionsPlugin } from './plugin-init';
import { setTestCallHandler } from './test/handler';
import { createInitializedClients, inviteMember, startFunctionsHost, TestType } from '../testing';
import { FunctionDef, FunctionTrigger } from '../types';

describe('functions e2e', () => {
  let testBuilder: TestBuilder;
  before(async () => {
    testBuilder = new TestBuilder();
  });
  after(async () => {
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
