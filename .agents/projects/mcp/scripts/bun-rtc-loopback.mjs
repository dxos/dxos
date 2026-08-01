// Loopback WebRTC data-channel test: two peers in one process, trickle candidates crossed over.
// Verifies whether node-datachannel's polyfill still crashes under bun (stale-TODO check).
import { RTCPeerConnection } from 'node-datachannel/polyfill';

const a = new RTCPeerConnection();
const b = new RTCPeerConnection();

a.onicecandidate = (e) => e.candidate && b.addIceCandidate(e.candidate);
b.onicecandidate = (e) => e.candidate && a.addIceCandidate(e.candidate);

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
const answer = await b.createAnswer();
await b.setLocalDescription(answer);
await a.setRemoteDescription(b.localDescription);

console.log('received:', await done);
a.close();
b.close();
const ndc = await import('node-datachannel');
ndc.cleanup();
console.log('OK: no segfault, channel round-trip succeeded');
process.exit(0);
