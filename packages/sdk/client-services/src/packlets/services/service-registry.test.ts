//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { Invitation, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { createLinkedPorts, createProtoRpcPeer, createServiceBundle } from '@dxos/rpc';

import { SpaceInvitationsProxy, SpaceInvitationsServiceImpl } from './invitations';
import { ServiceRegistry } from './service-registry';
import { createServiceContext } from './testing';

type TestServices = {
  SpaceInvitationsService: InvitationsService;
};

const serviceBundle = createServiceBundle<TestServices>({
  // HaloInvitationsService: schema.getService('dxos.client.services.InvitationsService'),
  SpaceInvitationsService: schema.getService('dxos.client.services.InvitationsService')
});

type Provider<T> = () => T | undefined;

interface Test {
  foo: number;
  log: () => void;
}

const createProviderProxy = <T>(provider: Provider<T>): T => {
  return new Proxy<Provider<T>>(provider, {
    get(target: Provider<T>, prop) {
      const value = provider();
      if (value === undefined) {
        throw new Error('Value undefined.');
      }

      const obj: { [i: string | symbol]: any } = value!;
      return obj[prop];
    }
  }) as any as T;
};

describe.only('service registry', function () {
  it('tests proxies', function () {
    {
      const value: Test = {
        foo: 100,
        log: () => {
          console.log('xxx');
        }
      };

      const proxy = createProviderProxy<Test>(() => value);
      proxy.log();
    }
  });

  it.only('builds a service registry', async function () {
    const serviceContext = createServiceContext();
    await serviceContext.open();
    await serviceContext.createIdentity();

    assert(serviceContext.spaceManager);
    assert(serviceContext.spaceInvitations);
    const space = await serviceContext.spaceManager.createSpace();

    const serviceRegistry = new ServiceRegistry(serviceBundle);

    const provider = () => {
      return new SpaceInvitationsServiceImpl(serviceContext.spaceManager!, serviceContext.spaceInvitations!);
    };

    const xxx: InvitationsService = createProviderProxy(provider);

    const [proxyPort, serverPort] = createLinkedPorts();

    const proxy = createProtoRpcPeer({
      port: proxyPort,
      requested: serviceRegistry.services,
      exposed: {},
      handlers: {}
    });

    const server = createProtoRpcPeer({
      port: serverPort,
      requested: {},
      exposed: serviceRegistry.services,
      handlers: {
        SpaceInvitationsService: xxx
      }
    });

    log('opening...');
    await Promise.all([proxy.open(), server.open()]);
    log('open');

    // TODO(burdon): Create TestService (that doesn't require peers).

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
