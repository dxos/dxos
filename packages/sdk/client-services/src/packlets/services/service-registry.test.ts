//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Event } from '@dxos/async';
import { type ClientServices } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { type SystemService, SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { createLinkedPorts, createProtoRpcPeer, createServiceBundle } from '@dxos/rpc';
import { describe, test } from '@dxos/test';

import { ServiceRegistry } from './service-registry';
import { SystemServiceImpl } from '../system';
import { createServiceContext } from '../testing';

// TODO(burdon): Create TestService (that doesn't require peers).

type TestServices = {
  SystemService: SystemService;
};

const serviceBundle = createServiceBundle<TestServices>({
  SystemService: schema.getService('dxos.client.services.SystemService'),
});

describe('service registry', () => {
  test('builds a service registry', async () => {
    const remoteSource = 'https://remote.source';
    const serviceContext = await createServiceContext();
    await serviceContext.open(new Context());

    const serviceRegistry = new ServiceRegistry(serviceBundle, {
      SystemService: new SystemServiceImpl({
        config: () => new Config({ runtime: { client: { remoteSource } } }),
        getCurrentStatus: () => SystemStatus.ACTIVE,
        getDiagnostics: async () => ({}),
        onReset: () => {},
        onUpdateStatus: () => {},
        statusUpdate: new Event(),
      }),
    });

    const [proxyPort, serverPort] = createLinkedPorts();

    const proxy = createProtoRpcPeer({
      requested: serviceRegistry.descriptors,
      exposed: {},
      handlers: {},
      port: proxyPort,
    });

    const server = createProtoRpcPeer({
      exposed: serviceRegistry.descriptors,
      handlers: serviceRegistry.services as ClientServices,
      port: serverPort,
    });

    log('opening...');
    await Promise.all([proxy.open(), server.open()]);
    log('open');

    {
      const config = await proxy.rpc.SystemService.getConfig();
      expect(config.runtime?.client?.remoteSource).to.equal(remoteSource);
    }

    // TODO(burdon): Error handling (create tests).
    //  Uncaught Error: Request was terminated because the RPC endpoint is closed.
    // log('closing...');
    // await Promise.all([proxy.close(), server.close()]);
    // await serviceContext.close();
    // log('closed');
  });
});
