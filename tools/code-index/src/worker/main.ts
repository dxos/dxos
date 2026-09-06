//
// Copyright 2026 DXOS.org
//
// Worker entry point. Spawned as a worker thread by `Pool`, so its imports carry explicit `.ts`
// extensions: the file is loaded by the runtime directly, without a bundler to resolve them.
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import type * as Ontology from '../Ontology.ts';
import { type Resolve, analyze, createResolver } from './analyze.ts';
import { Rpcs } from './Protocol.ts';

const resolvers = new Map<string, Resolve>();

const resolverFor = (root: string): Resolve => {
  const existing = resolvers.get(root);
  if (existing) {
    return existing;
  }
  const created = createResolver(root);
  resolvers.set(root, created);
  return created;
};

const handlers = Rpcs.toLayer({
  AnalyzeBatch: ({ root, files }) =>
    Effect.promise(async () => {
      const resolve = resolverFor(root);
      const analyzed: Array<{ path: string; mtime: number; document: Ontology.FileDocument }> = [];
      const skipped: Array<{ path: string; reason: string }> = [];
      for (const file of files) {
        try {
          const absolute = join(root, file.path);
          const [source, stats] = await Promise.all([readFile(absolute, 'utf8'), stat(absolute)]);
          // The mtime travels back with the document: the main thread commits what was actually
          // read, so a file written mid-crawl is reindexed rather than recorded as up to date.
          const mtime = Math.floor(stats.mtimeMs);
          analyzed.push({
            path: file.path,
            mtime,
            document: analyze({ root, path: file.path, source, mtime, resolve }),
          });
        } catch (error) {
          skipped.push({ path: file.path, reason: error instanceof Error ? error.message : String(error) });
        }
      }
      return { analyzed, skipped };
    }),
});

const layer = RpcServer.layer(Rpcs).pipe(
  Layer.provide(handlers),
  Layer.provide(RpcServer.layerProtocolWorkerRunner),
  Layer.provide(await workerRunnerLayer()),
);

Effect.runFork(Layer.launch(layer));

/** The runner platform differs per runtime: Bun spawns web workers, Node spawns worker threads. */
async function workerRunnerLayer() {
  if (typeof globalThis.Bun !== 'undefined') {
    const { BunWorkerRunner } = await import('@effect/platform-bun');
    return BunWorkerRunner.layer;
  }
  const { NodeWorkerRunner } = await import('@effect/platform-node');
  return NodeWorkerRunner.layer;
}
