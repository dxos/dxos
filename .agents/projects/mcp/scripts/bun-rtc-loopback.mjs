// Loopback WebRTC data-channel test: two peers in one process, trickle candidates crossed over.
// Verifies whether node-datachannel's polyfill still crashes under bun (stale-TODO check).
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve `node-datachannel` from network-manager's dependency tree so the script runs from
// anywhere in the repo (the script's own directory has no node_modules chain).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(resolve(repoRoot, 'packages/core/mesh/network-manager/package.json'));
const { RTCPeerConnection } = require('node-datachannel/polyfill');
const ndc = require('node-datachannel');

const a = new RTCPeerConnection();
const b = new RTCPeerConnection();

// Candidates can trickle before the receiving peer has a remote description (addIceCandidate
// would reject); buffer them until the corresponding setRemoteDescription resolves.
const makeCandidateRelay = (target) => {
  const queue = [];
  let ready = false;
  return {
    onCandidate: (event) => {
      if (!event.candidate) {
        return;
      }
      if (ready) {
        target.addIceCandidate(event.candidate).catch((err) => console.error('addIceCandidate:', err.message));
      } else {
        queue.push(event.candidate);
      }
    },
    drain: async () => {
      ready = true;
      for (const candidate of queue.splice(0)) {
        await target.addIceCandidate(candidate).catch((err) => console.error('addIceCandidate:', err.message));
      }
    },
  };
};

const toB = makeCandidateRelay(b);
const toA = makeCandidateRelay(a);
a.onicecandidate = toB.onCandidate;
b.onicecandidate = toA.onCandidate;

try {
  const done = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout: channel never opened')), 10_000);
    b.ondatachannel = ({ channel }) => {
      channel.onmessage = (e) => {
        clearTimeout(timer);
        resolve(e.data);
      };
    };
    const ch = a.createDataChannel('test');
    ch.onopen = () => ch.send('hello-from-bun');
  });

  const offer = await a.createOffer();
  await a.setLocalDescription(offer);
  await b.setRemoteDescription(a.localDescription);
  await toB.drain();
  const answer = await b.createAnswer();
  await b.setLocalDescription(answer);
  await a.setRemoteDescription(b.localDescription);
  await toA.drain();

  console.log('received:', await done);
  console.log('OK: no segfault, channel round-trip succeeded');
} finally {
  a.close();
  b.close();
  ndc.cleanup();
}
process.exit(0);
