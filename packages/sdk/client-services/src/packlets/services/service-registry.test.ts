//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { createLinkedPorts, createProtoRpcPeer, createServiceBundle } from '@dxos/rpc';

import { SpaceInvitationsProxy, SpaceInvitationsServiceImpl } from '../invitations';
import { createServiceContext } from '../testing';
import { createLazyLoadedService, ServiceRegistry } from './service-registry';

// TODO(burdon): Create TestService (that doesn't require peers).

type TestServices = {
  SpaceInvitationsService: InvitationsService;
};

const serviceBundle = createServiceBundle<TestServices>({
  SpaceInvitationsService: schema.getService('dxos.client.services.InvitationsService')
});

describe('service registry', function () {
  it('builds a service registry', async function () {
    const serviceContext = createServiceContext();
    await serviceContext.open();
    await serviceContext.createIdentity();

    assert(serviceContext.spaceManager);
    assert(serviceContext.spaceInvitations);
    const space = await serviceContext.spaceManager.createSpace();

    const serviceRegistry = new ServiceRegistry(serviceBundle, {
      SpaceInvitationsService: createLazyLoadedService(schema.getService('dxos.client.services.InvitationsService'), () => {
        return new SpaceInvitationsServiceImpl(serviceContext.spaceManager!, serviceContext.spaceInvitations!);
      })
    });

    const [proxyPort, serverPort] = createLinkedPorts();

    const proxy = createProtoRpcPeer({
      requested: serviceRegistry.descriptors,
      exposed: {},
      handlers: {},
      port: proxyPort
    });

    const server = createProtoRpcPeer({
      exposed: serviceRegistry.descriptors,
      handlers: serviceRegistry.services,
      port: serverPort
    });

    log('opening...');
    await Promise.all([proxy.open(), server.open()]);
    log('open');

    const done = new Trigger(); // createRpcServer

    {
      const spaceInvitationsProxy = new SpaceInvitationsProxy(proxy.rpc.SpaceInvitationsService);
      const observer = spaceInvitationsProxy.createInvitation(space.key);
      observer.subscribe({
        onConnecting: (invitation: Invitation) => {
          log('connecting', invitation);
          void observer.cancel();
        },
        onCancelled: () => {
          done.wake();
        },
        onSuccess: (invitation: Invitation) => {
          throw new Error('Not not implemented.');
        },
        onError: (err: Error) => {
          throw new Error('Not not implemented.');
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
