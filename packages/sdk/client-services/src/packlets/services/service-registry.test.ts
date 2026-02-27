//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { Config } from '@dxos/config';
import { create } from '@dxos/protocols/buf';
import {
  ConfigSchema,
  RuntimeSchema,
  Runtime_ClientSchema,
} from '@dxos/protocols/buf/dxos/config_pb';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type Client } from '@dxos/protocols';
import { EMPTY } from '@dxos/protocols/buf';
import * as ClientServicesPb from '@dxos/protocols/buf/dxos/client/services_pb';
import { SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import { createBufProtoRpcPeer, createBufServiceBundle, createLinkedPorts } from '@dxos/rpc';

import { SystemServiceImpl } from '../system';
import { createServiceContext } from '../testing';

import { ServiceRegistry } from './service-registry';

// TODO(burdon): Create TestService (that doesn't require peers).

type TestServices = {
  SystemService: Client.SystemService;
};

const serviceBundle = createBufServiceBundle({
  SystemService: ClientServicesPb.SystemService,
});

describe('service registry', () => {
  test('builds a service registry', async () => {
    const remoteSource = 'https://remote.source';
    const serviceContext = await createServiceContext();
    await serviceContext.open(new Context());

    const serviceRegistry = new ServiceRegistry<TestServices, typeof serviceBundle>(serviceBundle, {
      SystemService: new SystemServiceImpl({
        config: () =>
          new Config(
            create(ConfigSchema, {
              runtime: create(RuntimeSchema, {
                client: create(Runtime_ClientSchema, { remoteSource }),
              }),
            }),
          ),
        getCurrentStatus: () => SystemStatus.ACTIVE,
        getDiagnostics: async () => ({}),
        onReset: () => {},
        onUpdateStatus: () => {},
        statusUpdate: new Event(),
      }),
    });

    const [proxyPort, serverPort] = createLinkedPorts();

    const proxy = createBufProtoRpcPeer({
      requested: serviceRegistry.descriptors,
      port: proxyPort,
    });

    const server = createBufProtoRpcPeer({
      exposed: serviceRegistry.descriptors,
      handlers: serviceRegistry.services as never,
      port: serverPort,
    });

    log('opening...');
    await Promise.all([proxy.open(), server.open()]);
    log('open');

    {
      const config = await proxy.rpc.SystemService.getConfig(EMPTY);
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
