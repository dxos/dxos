//
// Copyright 2023 DXOS.org
//

import { readFileSync } from 'fs';

import { log } from '@dxos/log';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const { stats } = data;

const statsPerPeer = new Map();

// const key = 'peerThatDiscovering'
const key = 'peerToDiscover';

for (const evt of stats.failures) {
  const peer = evt.action[key];
  const counters = statsPerPeer.get(peer) ?? {
    failures: 0,
    discoveredPeers: 0,
    exchangedMessages: 0,
  };
  counters.failures++;
  statsPerPeer.set(peer, counters);
}

for (const evt of stats.exchangedMessages) {
  const peer = evt.action[key];
  const counters = statsPerPeer.get(peer) ?? {
    failures: 0,
    discoveredPeers: 0,
    exchangedMessages: 0,
  };
  counters.exchangedMessages++;
  statsPerPeer.set(peer, counters);
}

for (const evt of stats.discoveredPeers) {
  const peer = evt[key];
  const counters = statsPerPeer.get(peer) ?? {
    failures: 0,
    discoveredPeers: 0,
    exchangedMessages: 0,
  };

  counters.discoveredPeers++;
  statsPerPeer.set(peer, counters);
}

const output = Array.from(statsPerPeer.entries()).sort((a, b) => b[1].failures - a[1].failures);

for (const [peer, counters] of output) {
  log.info(`${peer}: ${counters.failures} ${((counters.failures / counters.discoveredPeers) * 100).toFixed(2)}%`);
}
