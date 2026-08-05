// TCP proxy that injects a fixed one-way delay in each direction, so a round-trip
// costs `delay` ms total. Stands in for `tc netem` where the kernel lacks sch_netem.
import net from 'node:net';

const [listenPort, targetPort, rttMs] = process.argv.slice(2).map(Number);
const oneWay = rttMs / 2;

let conns = 0;
let bytes = 0;
let chunks = 0;

const pipeDelayed = (from, to) => {
  from.on('data', (chunk) => {
    bytes += chunk.length;
    chunks++;
    if (oneWay <= 0) {
      to.write(chunk);
    } else {
      setTimeout(() => to.write(chunk), oneWay);
    }
  });
  from.on('close', () => setTimeout(() => to.end(), oneWay + 5));
  from.on('error', () => to.destroy());
};

net
  .createServer((client) => {
    conns++;
    const upstream = net.connect(targetPort, '127.0.0.1');
    pipeDelayed(client, upstream);
    pipeDelayed(upstream, client);
  })
  .listen(listenPort, '127.0.0.1', () => {
    console.error(`delay-proxy :${listenPort} -> :${targetPort} rtt=${rttMs}ms`);
  });

process.on('SIGTERM', () => {
  console.error(JSON.stringify({ rttMs, conns, chunks, bytes }));
  process.exit(0);
});
