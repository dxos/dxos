//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { EchoDataMonitor } from './echo-data-monitor.ts';

describe('EchoDataMonitorTest', () => {
  test('connectionsCount', async () => {
    const dataMonitor = new EchoDataMonitor();
    expect(dataMonitor.connectionsCount).to.eq(0);
    dataMonitor.recordPeerConnected('A');
    expect(dataMonitor.connectionsCount).to.eq(1);
    dataMonitor.tick(1000); // Test count doesn't change.
    expect(dataMonitor.connectionsCount).to.eq(1);
    dataMonitor.recordPeerDisconnected('B');
    expect(dataMonitor.connectionsCount).to.eq(0);
  });

  test('counters', async () => {
    const dataMonitor = new EchoDataMonitor();
    expect(dataMonitor.lastPerSecondStats).to.be.undefined;
    dataMonitor.tick(1000);
    expect(dataMonitor.lastPerSecondStats).not.to.be.undefined;
    const loadedBytes = 100;
    dataMonitor.recordBytesLoaded(loadedBytes);
    expect(dataMonitor.lastPerSecondStats?.storage?.loadedBytes).to.eq(0);
    dataMonitor.tick(1000);
    expect(dataMonitor.lastPerSecondStats?.storage?.loadedBytes).to.eq(100);
    dataMonitor.tick(1000);
    expect(dataMonitor.lastPerSecondStats?.storage?.loadedBytes).to.eq(0);
  });

  test('averages', async () => {
    const dataMonitor = new EchoDataMonitor();
    expect(storedChunkSize(dataMonitor)).to.eq(0);
    dataMonitor.recordBytesStored(1000);
    expect(storedChunkSize(dataMonitor)).to.eq(1000);
    dataMonitor.recordBytesStored(500);
    expect(storedChunkSize(dataMonitor)).to.eq(750);
    dataMonitor.tick(1000); // Test average doesn't change.
    expect(storedChunkSize(dataMonitor)).to.eq(750);
    dataMonitor.recordBytesStored(0);
    expect(storedChunkSize(dataMonitor)).to.eq(500);
  });

  const storedChunkSize = (monitor: EchoDataMonitor) => monitor.computeStats().storage.writes.payloadSize;
});
