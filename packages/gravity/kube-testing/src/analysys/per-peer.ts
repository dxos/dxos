import { readFileSync } from "fs";

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const { testConfig, shortStats, stats } = data;

const statsPerPeer = new Map();

for (const failure of stats.failures) {
  const peer = failure.action.peerThatDiscovering;
  const counters = statsPerPeer.get(peer) ?? {
    failures: 0,
    discoveredPeers: 0,
    exchangedMessages: 0
  };


  counters.failures++;
  statsPerPeer.set(peer, counters);
}

for (const failure of stats.exchangedMessages) {
  const peer = failure.action.peerThatDiscovering;
  const counters = statsPerPeer.get(peer) ?? {
    failures: 0,
    discoveredPeers: 0,
    exchangedMessages: 0
  };


  counters.exchangedMessages++;
  statsPerPeer.set(peer, counters);
}

for (const failure of stats.discoveredPeers) {
  const peer = failure.peerThatDiscovering;
  const counters = statsPerPeer.get(peer) ?? {
    failures: 0,
    discoveredPeers: 0,
    exchangedMessages: 0
  };

  counters.discoveredPeers++;
  statsPerPeer.set(peer, counters);
}

const output = Array.from(statsPerPeer.entries()).sort((a, b) => b[1].failures - a[1].failures);

for(const [peer, counters] of output) {
  console.log(`${peer}: ${counters.failures} ${(counters.failures / counters.discoveredPeers * 100).toFixed(2)}%`);
}