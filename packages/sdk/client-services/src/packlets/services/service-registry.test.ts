//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { createLinkedPorts, createProtoRpcPeer, createServiceBundle } from '@dxos/rpc';

import { SpaceInvitationsProxy, SpaceInvitationsServiceImpl } from '../invitations';
import { createServiceContext } from '../testing';
import { createServiceProvider, ServiceRegistry } from './service-registry';

// TODO(burdon): Create TestService (that doesn't require peers).

type TestServices = {
  SpaceInvitationsService: InvitationsService;
};

const serviceBundle = createServiceBundle<TestServices>({
  SpaceInvitationsService: schema.getService('dxos.client.services.InvitationsService')
});

describe.only('service registry', function () {
  it('creates a proxy', async function () {
    interface Test {
      value: number;
      add: (...args: number[]) => Promise<number>;
    }

    const proxy = createServiceProvider<Test>(() => ({
      value: 100,
      add: (...args: number[]) => Promise.resolve(args.reduce((result, value) => result + value, 0))
    }));

    expect(proxy.value).to.eq(100);
    expect(await proxy.add(1, 2, 3)).to.eq(6);
  });

  it.only('builds a service registry', async function () {
    const serviceContext = createServiceContext();
    await serviceContext.open();
    await serviceContext.createIdentity();

    assert(serviceContext.spaceManager);
    assert(serviceContext.spaceInvitations);
    const space = await serviceContext.spaceManager.createSpace();

    const serviceRegistry = new ServiceRegistry(serviceBundle, {
      SpaceInvitationsService: createServiceProvider(() => {
        return new SpaceInvitationsServiceImpl(serviceContext.spaceManager!, serviceContext.spaceInvitations!);
      })
    });

    const [proxyPort, serverPort] = createLinkedPorts();

    const proxy = createProtoRpcPeer({
      port: proxyPort,
      requested: serviceRegistry.descriptors,
      exposed: {},
      handlers: {}
    });

    const server = createProtoRpcPeer({
      port: serverPort,
      requested: {},
      exposed: serviceRegistry.descriptors,
      handlers: serviceRegistry.services
    });

    log('opening...');
    await Promise.all([proxy.open(), server.open()]);
    log('open');

    const done = new Trigger(); // createRpcServer

    {
      // proxy.rpc.SpaceInvitationsService.createInvitation();
      const spaceInvitationsProxy = new SpaceInvitationsProxy(proxy.rpc.SpaceInvitationsService);
      const observer = spaceInvitationsProxy.createInvitation(space.key);
      observer.subscribe({
        onConnecting: (invitation: Invitation) => {
          log('connecting', invitation);
          void observer.cancel();
        },
        onCancelled: () => {
          done.wake();
        }
      });
    }

    await done.wait();

    // TODO(burdon): Error handling (create tests).
    //  Uncaught Error: Request was terminated because the RPC endpoint is closed.
    // log('closing...');
    // await Promise.all([proxy.close(), server.close()]);
    // await serviceContext.close();
    // log('closed');
  });
});
