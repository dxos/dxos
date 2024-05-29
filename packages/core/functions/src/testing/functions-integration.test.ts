//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import path from 'path';

import { Trigger, waitForCondition } from '@dxos/async';
import { type Client } from '@dxos/client';
import { create, type Space } from '@dxos/client/echo';
import { performInvitation, TestBuilder } from '@dxos/client/testing';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test } from '@dxos/test';

import { setTestCallHandler } from './test/handler';
import { FunctionRegistry } from '../function';
import { DevServer, Scheduler } from '../runtime';
import { createFunctionRuntime, createInitializedClients, TestType } from '../testing';
import { TriggerRegistry } from '../trigger';
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
    const functionRuntime = await createFunctionRuntime(testBuilder);
    const functionsRegistry = new FunctionRegistry(functionRuntime);
    const devServer = await startDevServer(functionRuntime, functionsRegistry);
    const scheduler = await startScheduler(functionRuntime, devServer, functionsRegistry);

    const app = (await createInitializedClients(testBuilder, 1))[0];
    const space = await app.spaces.create();
    await inviteMember(space, functionRuntime);

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

    await waitTriggersReplicated(space, scheduler);
    const addedObject = space.db.add(create(TestType, { title: '42' }));

    const callArgs = await called.wait();
    expect(callArgs.meta).to.deep.eq(triggerMeta);
    expect(callArgs.objects).to.deep.eq([addedObject.id]);
    expect(callArgs.spaceKey).to.eq(space.key.toHex());
  });

  const waitTriggersReplicated = async (space: Space, scheduler: Scheduler) => {
    await waitForCondition({ condition: () => scheduler.triggers.getActiveTriggers(space).length > 0 });
  };

  // TODO(burdon): Factor out utils to builder pattern.

  const startScheduler = async (client: Client, devServer: DevServer, functionRegistry: FunctionRegistry) => {
    const triggerRegistry = new TriggerRegistry(client);
    const scheduler = new Scheduler(functionRegistry, triggerRegistry, { endpoint: devServer.endpoint });
    await scheduler.start();
    testBuilder.ctx.onDispose(() => scheduler.stop());
    return scheduler;
  };

  const startDevServer = async (client: Client, functionRegistry: FunctionRegistry) => {
    const server = new DevServer(client, functionRegistry, {
      baseDir: path.join(__dirname, '../testing'),
    });
    await server.start();
    testBuilder.ctx.onDispose(() => server.stop());
    return server;
  };

  const inviteMember = async (host: Space, guest: Client) => {
    const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host, guest: guest.spaces }));
    expect(hostInvitation?.state).to.eq(Invitation.State.SUCCESS);
  };
});
