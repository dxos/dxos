//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { EchoDataMonitor } from './echo-data-monitor';

describe('EchoDataMonitorTest', () => {
  test('connectionsCount', async () => {
    const dataMonitor = createMonitor();
    expect(dataMonitor.connectionsCount).to.eq(0);
    dataMonitor.recordPeerConnected('A');
    expect(dataMonitor.connectionsCount).to.eq(1);
    tick(dataMonitor); // Test count doesn't change.
    expect(dataMonitor.connectionsCount).to.eq(1);
    dataMonitor.recordPeerDisconnected('B');
    expect(dataMonitor.connectionsCount).to.eq(0);
  });

  test('counters', async () => {
    const dataMonitor = createMonitor();
    expect(dataMonitor.lastPerSecondStats).to.be.undefined;
    tick(dataMonitor);
    expect(dataMonitor.lastPerSecondStats).not.to.be.undefined;
    const loadedBytes = 100;
    dataMonitor.recordBytesLoaded(loadedBytes);
    expect(dataMonitor.lastPerSecondStats?.storage?.loadedBytes).to.eq(0);
    tick(dataMonitor);
    expect(dataMonitor.lastPerSecondStats?.storage?.loadedBytes).to.eq(100);
    tick(dataMonitor);
    expect(dataMonitor.lastPerSecondStats?.storage?.loadedBytes).to.eq(0);
  });

  test('averages', async () => {
    const dataMonitor = createMonitor();
    expect(storedChunkSize(dataMonitor)).to.eq(0);
    dataMonitor.recordBytesStored(1000);
    expect(storedChunkSize(dataMonitor)).to.eq(1000);
    dataMonitor.recordBytesStored(500);
    expect(storedChunkSize(dataMonitor)).to.eq(750);
    tick(dataMonitor); // Test average doesn't change.
    expect(storedChunkSize(dataMonitor)).to.eq(750);
    dataMonitor.recordBytesStored(0);
    expect(storedChunkSize(dataMonitor)).to.eq(500);
  });

  const storedChunkSize = (monitor: EchoDataMonitor) => monitor.computeStats().storage.writes.payloadSize;

  const createMonitor = () => new EchoDataMonitor();

  const tick = (monitor: EchoDataMonitor) => monitor.tick(1000);
});
