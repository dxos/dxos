//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as FactStoreHttp from '../store/fact-store-http.ts';
import { type FactStoreApi } from '../store/fact-store.ts';

export type FactServerOptions = {
  /** 0 picks a free port. */
  readonly port?: number;
  readonly host?: string;
};

export type FactServer = {
  /** Base URL a {@link FactStoreHttp.make} client points at. */
  readonly url: string;
};

type Listening = FactServer & { readonly close: () => void };

const readBody = (request: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });

/** Bridges node's request/response pair to the fetch-style {@link FactStoreHttp.handle}. */
const respond = async (store: FactStoreApi, request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const body = request.method === 'POST' ? new Uint8Array(await readBody(request)) : undefined;
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') {
      headers.set(name, value);
    }
  }
  const answer = await EffectEx.runPromise(
    FactStoreHttp.handle(
      store,
      new Request(new URL(request.url ?? '/', 'http://localhost'), { method: request.method, headers, body }),
    ),
  );
  response.writeHead(answer.status, Object.fromEntries(answer.headers));
  response.end(Buffer.from(await answer.arrayBuffer()));
};

/**
 * Serves `store` over HTTP on node for the scope's lifetime (closed when the scope closes), so a browser story or
 * another process can read it through {@link FactStoreHttp.layer}.
 */
export const serveFactStore = (
  store: FactStoreApi,
  options: FactServerOptions = {},
): Effect.Effect<FactServer, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.callback<Listening>((resume) => {
      const server = createServer((request, response) => {
        respond(store, request, response).catch((error: unknown) => {
          response.writeHead(500, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ error: String(error) }));
        });
      });
      const host = options.host ?? '127.0.0.1';
      server.listen(options.port ?? 0, host, () => {
        const address = server.address();
        const port = typeof address === 'object' && address !== null ? address.port : options.port;
        resume(Effect.succeed({ url: `http://${host}:${port}`, close: () => server.close() }));
      });
    }),
    (listening) => Effect.sync(() => listening.close()),
  ).pipe(Effect.map(({ url }) => ({ url })));
