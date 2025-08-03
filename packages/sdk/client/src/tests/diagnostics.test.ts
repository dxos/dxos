//
// Copyright 2024 DXOS.org
//

import { beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { DiagnosticsCollector } from '@dxos/client-services';
import { Context } from '@dxos/context';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe.skip('DiagnosticsCollector', () => {
  beforeEach(() => {
    TRACE_PROCESSOR.resources.clear();
  });

  test('collects configs and traces if client was not initialized', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const diagnostics = await DiagnosticsCollector.collect();
    expect(diagnostics.client.config).not.to.be.undefined;
    expect(diagnostics.client.trace).not.to.be.undefined;
    expect(diagnostics.services).to.be.undefined;
  });

  test('collects with local services', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const client = new Client({ config: testBuilder.config, services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());

    const diagnostics = await DiagnosticsCollector.collect();
    expect(diagnostics.client.config).not.to.be.undefined;
    expect(diagnostics.services).not.to.be.undefined;
  });

  test('collects with remote server', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const peer = testBuilder.createClientServicesHost();
    await peer.open(new Context());
    const [client, server] = testBuilder.createClientServer(peer);
    void server.open();
    await client.initialize();
    onTestFinished(() => client.destroy());

    const diagnostics = await DiagnosticsCollector.collect();
    expect(diagnostics.client.config).not.to.be.undefined;
    expect(diagnostics.services).not.to.be.undefined;
  });
});
