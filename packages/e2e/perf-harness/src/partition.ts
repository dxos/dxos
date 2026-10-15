//
// Copyright 2026 DXOS.org
//

import { createServer } from 'node:http';
import { type Socket, connect } from 'node:net';

/** One request a partitioned browser tried to send off the machine. */
export type DeniedRequest = { host: string; port: number; method: string };

export type PartitionProxy = {
  port: number;
  /** Every refused request, in order. */
  denied: () => DeniedRequest[];
  /** Every TLS tunnel opened to an allowed host, in order. */
  tunnelled: () => DeniedRequest[];
  close: () => Promise<void>;
};

export type PartitionOptions = {
  /** Hosts a TLS tunnel may reach, e.g. a non-production EDGE; everything else is refused. */
  allow?: ReadonlyArray<string>;
};

const FORBIDDEN = 'HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n';

/** Nothing listens on the discard port, so an offline bundle's EDGE connections fail at once, locally. */
export const OFFLINE_EDGE_URL = 'http://127.0.0.1:9/';

/** The environments under `dxos.network` that are not production. */
const NON_PRODUCTION_EDGE = new Set(['dev.dxos.network', 'preview.dxos.network', 'staging.dxos.network']);

/**
 * Whether `host` is production EDGE: `dxos.network`, a service directly under it (`hub.dxos.network`)
 * or a `*-production` worker. Other environments sit a level down (`hub.dev.dxos.network`).
 */
export const isProductionEdgeHost = (host: string): boolean =>
  host === 'dxos.network' ||
  (host.endsWith('.dxos.network') && host.split('.').length === 3 && !NON_PRODUCTION_EDGE.has(host)) ||
  /-production\.dxos\.workers\.dev$/.test(host);

/**
 * A loopback HTTP proxy that refuses every request except TLS tunnels to the allowed hosts, so a
 * browser pointed at it reaches nothing else off the machine.
 */
export const startPartitionProxy = async ({ allow = [] }: PartitionOptions = {}): Promise<PartitionProxy> => {
  const production = allow.filter(isProductionEdgeHost);
  if (production.length > 0) {
    throw new Error(`a partition never tunnels to production EDGE: ${production.join(', ')}`);
  }
  const allowed = new Set(allow);
  const denied: DeniedRequest[] = [];
  const tunnelled: DeniedRequest[] = [];
  const sockets = new Set<Socket>();
  // A proxied request names an absolute URL, a CONNECT names only `host:port`.
  const record = (url: URL | undefined, method: string, defaultPort: number) => {
    denied.push({ host: url?.hostname ?? '', port: Number(url?.port) || defaultPort, method });
  };
  const parse = (target: string | undefined): URL | undefined =>
    URL.canParse(target ?? '') ? new URL(target ?? '') : undefined;
  const server = createServer((request, response) => {
    record(parse(request.url), request.method ?? 'GET', 80);
    response.writeHead(403, { connection: 'close' }).end();
  });
  // HTTPS and secure WebSockets tunnel through CONNECT; plain WebSockets arrive as an upgrade.
  server.on('connect', (request, socket, head) => {
    const target = parse(`http://${request.url ?? ''}`);
    if (!target || !allowed.has(target.hostname)) {
      record(target, 'CONNECT', 443);
      socket.end(FORBIDDEN);
      return;
    }
    const port = Number(target.port) || 443;
    tunnelled.push({ host: target.hostname, port, method: 'CONNECT' });
    const upstream = connect(port, target.hostname, () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    sockets.add(upstream);
    upstream.once('close', () => sockets.delete(upstream));
    upstream.once('error', () => socket.destroy());
    socket.once('error', () => upstream.destroy());
  });
  server.on('upgrade', (request, socket) => {
    record(parse(request.url), 'UPGRADE', 80);
    socket.end(FORBIDDEN);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('the partition proxy has no TCP address');
  }
  return {
    port: address.port,
    denied: () => [...denied],
    tunnelled: () => [...tunnelled],
    close: () =>
      new Promise((resolve) => {
        for (const upstream of sockets) {
          upstream.destroy();
        }
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

/**
 * Chromium flags that leave the browser loopback and the deny proxy, nothing else. Chromium sends
 * loopback direct already; other hosts go to the proxy unresolved, and anything that tries to go
 * around it finds no address outside loopback and no direct UDP for WebRTC.
 */
export const partitionArgs = (proxyPort: number): string[] => [
  `--proxy-server=http://127.0.0.1:${proxyPort}`,
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--disable-quic',
];

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

/** Whether a URL a page fetched stays inside the partition: loopback, an allowed host, or no network at all. */
export const insidePartition = (url: string, allow: ReadonlyArray<string> = []): boolean => {
  if (!URL.canParse(url)) {
    return true;
  }
  const { protocol, hostname } = new URL(url);
  return !['http:', 'https:', 'ws:', 'wss:'].includes(protocol) || LOOPBACK.has(hostname) || allow.includes(hostname);
};
