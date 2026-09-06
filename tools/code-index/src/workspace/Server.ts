//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as NodeHttpServer from '@effect/platform-node/NodeHttpServer';
import * as Console from 'effect/Console';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Crawler from '../Crawler.ts';
import * as Store from '../Store.ts';
import * as Agent from './Agent.ts';
import * as Handlers from './Handlers.ts';
import * as Log from './Log.ts';
import type * as Models from './Models.ts';
import * as Protocol from './Protocol.ts';
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

/** The UI's root, resolved from this module so the server finds it whatever the working directory. */
const WEBUI_ROOT = fileURLToPath(new URL('../webui', import.meta.url));

export type Options = {
  readonly root: string;
  readonly port?: number;
  readonly host?: string;
  readonly model: Models.Selection;
};

export const run = ({
  root,
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
  model,
}: Options): Effect.Effect<void, ServerError | Vite.ViteError, Store.Store | Log.Log | Agent.Agent> =>
  Effect.gen(function* () {
    const scope = yield* Effect.scope;

    // NDJSON rather than JSON: the `Watch` stream is chunked down one response, and a client that
    // parses per line sees each event as it is appended instead of at the end of the turn.
    const rpcEffect = yield* RpcServer.toHttpEffect(Protocol.Rpcs).pipe(
      Effect.provide(Handlers.layer({ root, model })),
      Effect.provide(RpcSerialization.layerNdjson),
    );
    const rpc = yield* NodeHttpServer.makeHandler(rpcEffect, { scope });

    const vite = yield* Vite.middleware({
      appRoot: WEBUI_ROOT,
      repoRoot: root,
      cacheDir: join(Crawler.storeDir(root), 'vite'),
    });

    const server = createServer((request, response) => {
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
        }),
    );

    yield* Console.log(
      [
        `code-index · http://${host}:${port}`,
        `  repository  ${root}`,
        `  model       ${model.provider}/${model.model}`,
      ].join('\n'),
    );

    // The server runs until interrupted; the scope's finalizers close Vite and the listener.
    return yield* Effect.never;
  }).pipe(Effect.scoped);
