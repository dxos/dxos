//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as NodeHttpServer from '@effect/platform-node/NodeHttpServer';
import * as Cause from 'effect/Cause';
import * as Console from 'effect/Console';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as RpcSerialization from 'effect/rpc/RpcSerialization';
import * as RpcServer from 'effect/rpc/RpcServer';
import { createServer } from 'node:http';
import type { Socket } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Crawler from '../Crawler.ts';
import * as IndexThread from '../IndexThread.ts';
import type * as Store from '../Store.ts';
import * as Watch from '../Watch.ts';
import * as Agent from './Agent.ts';
import * as Handlers from './Handlers.ts';
import * as IndexStatus from './IndexStatus.ts';
import * as Log from './Log.ts';
import type * as Models from './Models.ts';
import * as Protocol from './Protocol.ts';
import type * as Titles from './Titles.ts';
import * as Vite from './Vite.ts';

/**
 * The default command: one HTTP listener serving the RPC endpoint and, on everything else, Vite in
 * middleware mode. Vite runs *inside this process* through its programmatic API, so the web UI is
 * transformed on demand from the same working tree the indexer reads — there is no bundle to
 * rebuild between an edit and a reload, and nothing to install beyond the workspace.
 */

export class ServerError extends Data.TaggedError('code-index/ServerError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

export const DEFAULT_PORT = 5599;

export const DEFAULT_HOST = '127.0.0.1';

/**
 * Hosts this server will bind. `/rpc` starts agent turns and reads the whole index, and it carries
 * no credential of any kind, so a bind reachable from the network would hand both to anyone who can
 * route to the port. Rather than invent an auth scheme for a single-user dev tool, the bind itself
 * is refused: whoever genuinely wants remote access can put a tunnel or a reverse proxy in front and
 * own the authentication there.
 */
const LOOPBACK = ['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1'];

const isLoopback = (host: string): boolean => LOOPBACK.includes(host) || /^127\.\d+\.\d+\.\d+$/.test(host);

/** The UI's root, resolved from this module so the server finds it whatever the working directory. */
const WEBUI_ROOT = fileURLToPath(new URL('../webui', import.meta.url));

export type Options = {
  readonly root: string;
  readonly port?: number;
  readonly host?: string;
  readonly model: Models.Selection;
  /**
   * Keep the index in `storeDir` current with `rules` while serving, on a worker thread
   * (`IndexThread.ts`); none to serve the store as it is.
   */
  readonly watch?: { readonly storeDir: string; readonly rules: string };
};

export const run = ({
  root,
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
  model,
  watch,
}: Options): Effect.Effect<void, ServerError | Vite.ViteError, Store.Store | Log.Log | Agent.Agent | Titles.Titles> =>
  Effect.gen(function* () {
    if (!isLoopback(host)) {
      return yield* Effect.fail(
        new ServerError({
          message:
            `Refusing to bind ${host}: /rpc runs agent turns and reads the index with no ` +
            'authentication. Bind loopback (the default) and put a tunnel or reverse proxy in front ' +
            'if you need it elsewhere.',
        }),
      );
    }

    const scope = yield* Effect.scope;

    // Built first and shared: the handlers stream it to the browser and the indexer thread feeds it.
    const indexContext = yield* Layer.buildWithScope(IndexStatus.layer({ watching: watch !== undefined }), scope);
    const index = Context.get(indexContext, IndexStatus.IndexStatus);

    // NDJSON rather than JSON: the `Watch` stream is chunked down one response, and a client that
    // parses per line sees each event as it is appended instead of at the end of the turn. Built in
    // this scope, not by `Effect.provide` (whose scope ends once the handler exists), so forked
    // turns last until shutdown.
    const handlers = yield* Layer.buildWithScope(
      Layer.mergeAll(
        Handlers.layer({ root, model }).pipe(Layer.provide(Layer.succeedContext(indexContext))),
        RpcSerialization.layerNdjson,
      ),
      scope,
    );
    const rpcEffect = yield* RpcServer.toHttpEffect(Protocol.Rpcs).pipe(Effect.provideContext(handlers));
    const rpc = yield* NodeHttpServer.makeHandler(rpcEffect, { scope });

    // Created before Vite so its HMR websocket rides this listener rather than a server of its own.
    const server = createServer();

    // Every socket, upgraded ones included: Bun's `closeAllConnections` skips a websocket, and
    // `close` waits on it forever.
    const sockets = new Set<Socket>();
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });

    const vite = yield* Vite.middleware({
      appRoot: WEBUI_ROOT,
      repoRoot: root,
      cacheDir: join(Crawler.storeDir(root), 'vite'),
      httpServer: server,
    });

    server.on('request', (request, response) => {
      if (request.url?.startsWith(Protocol.PATH)) {
        rpc(request, response);
      } else {
        vite.handle(request, response);
      }
    });

    yield* Effect.acquireRelease(
      Effect.callback<void, ServerError>((resume) => {
        server.once('error', (cause) => resume(Effect.fail(new ServerError({ message: 'Cannot listen', cause }))));
        server.listen(port, host, () => resume(Effect.void));
      }),
      () =>
        Effect.callback<void>((resume) => {
          server.close(() => resume(Effect.void));
          // A browser tab holds the `Watch` stream and the HMR socket open indefinitely, so they are
          // cut rather than waited for; their request fibers see the close and are interrupted.
          for (const socket of sockets) {
            socket.destroy();
          }
        }),
    );

    yield* Console.log(
      [
        `code-index · http://${host}:${port}`,
        `  repository  ${root}`,
        `  model       ${model.provider}/${model.model}`,
      ].join('\n'),
    );

    // A dead indexer thread leaves the index as it is, which is still worth serving.
    if (watch) {
      yield* Effect.forkScoped(
        IndexThread.run({
          root,
          ...watch,
          onEvent: (event) => Effect.andThen(Watch.log(event), index.report(event)),
        }).pipe(
          Effect.catchCause((cause) =>
            Effect.andThen(
              Console.error(`code-index · indexing stopped\n${Cause.pretty(cause)}`),
              index.report({ _tag: 'Failed', message: 'indexing stopped; restart serve to resume' }),
            ),
          ),
        ),
      );
    }

    // The server runs until interrupted; the scope's finalizers close Vite and the listener.
    return yield* Effect.never;
  }).pipe(Effect.scoped);
