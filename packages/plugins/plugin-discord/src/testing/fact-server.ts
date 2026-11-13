//
// Copyright 2026 DXOS.org
//

// Fact server (node): serves the RDF fact store crawl-demo persisted over HTTP, so a browser story (stories-brain
// `FactExplorer`) can explore it through `FactStoreHttp`. Runs until interrupted, and reopens the file when it is
// replaced (a `reextract` into a fresh file), so the server never needs a restart to see a rebuilt store.
//   [DISCORD_FACTS_DB=path] [DISCORD_FACT_SERVER_PORT=7700]  moon run plugin-discord:fact-server

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';
import { existsSync, statSync, watch } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import * as EffectEx from '@dxos/effect/EffectEx';
import { FactStore, type FactStoreApi, FactStoreLive } from '@dxos/pipeline-rdf';
import { serveFactStore } from '@dxos/pipeline-rdf/testing';

const factsPath = process.env.DISCORD_FACTS_DB ?? join(tmpdir(), 'dxos-discord-facts.db');
const port = Number(process.env.DISCORD_FACT_SERVER_PORT ?? 7700);

if (!existsSync(factsPath)) {
  console.error(`No fact store at ${factsPath}; run plugin-discord:crawl-demo first or set DISCORD_FACTS_DB.`);
  process.exit(1);
}

/** The file's inode: a replaced file (moved aside, recreated) has a new one, while writes in place keep it. */
// The file can vanish mid-swap, so a missing one reads as no inode rather than throwing.
const inodeOf = (path: string): number | undefined => statSync(path, { throwIfNoEntry: false })?.ino;

type Open = { readonly store: FactStoreApi; readonly scope: Scope.Closeable; readonly inode: number | undefined };

const open = Effect.gen(function* () {
  const scope = yield* Scope.make();
  const context = yield* Layer.buildWithScope(FactStoreLive.layerFile(factsPath), scope);
  return { store: Context.get(context, FactStore), scope, inode: inodeOf(factsPath) } satisfies Open;
});

const program = Effect.gen(function* () {
  let current: Open = yield* open;
  // Every call goes to whichever file is open now, so a reopen swaps the store under the running server.
  const store: FactStoreApi = {
    putFacts: (facts) => Effect.suspend(() => current.store.putFacts(facts)),
    predicates: () => Effect.suspend(() => current.store.predicates()),
    query: (query) => Effect.suspend(() => current.store.query(query)),
    select: (sparql) => Effect.suspend(() => current.store.select(sparql)),
    rows: (sparql) => Effect.suspend(() => current.store.rows(sparql)),
    cursor: (source) => Effect.suspend(() => current.store.cursor(source)),
    setCursor: (source, hash) => Effect.suspend(() => current.store.setCursor(source, hash)),
    clear: () => Effect.suspend(() => current.store.clear()),
  };

  // One reopen at a time: a single swap fires several watch events.
  const lock = yield* Semaphore.make(1);
  const reopen = Effect.gen(function* () {
    const inode = inodeOf(factsPath);
    // Gone (mid-swap) or unchanged: keep serving what is open.
    if (inode === undefined || inode === current.inode) {
      return;
    }
    const previous = current;
    current = yield* open;
    yield* Scope.close(previous.scope, Exit.void);
    const facts = yield* current.store.query({});
    console.log(`Reopened ${factsPath}: ${facts.length} facts`);
  }).pipe(lock.withPermits(1));

  const { url } = yield* serveFactStore(store, { port });
  const facts = yield* store.query({});
  console.log(`Serving ${facts.length} facts from ${factsPath}`);
  console.log(`  ${url}   (storybook: stories-brain › FactExplorer)`);

  // Watch the directory, not the file: a file watch follows the old inode once the file is moved aside.
  const name = basename(factsPath);
  const watcher = watch(dirname(factsPath), (_event, changed) => {
    if (changed === name) {
      void EffectEx.runPromise(reopen.pipe(Effect.catch((error) => Effect.logWarning(`reopen failed: ${error}`))));
    }
  });
  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      watcher.close();
      yield* Scope.close(current.scope, Exit.void);
    }),
  );
  return yield* Effect.never;
}).pipe(Effect.scoped);

const fiber = Effect.runFork(
  program.pipe(
    // A port already in use is reported, not thrown, so say so and exit rather than hang.
    Effect.catch((error) =>
      Effect.sync(() => {
        console.error(`${error.message}${error.cause instanceof Error ? `: ${error.cause.message}` : ''}`);
        process.exit(1);
      }),
    ),
  ),
);
// Interrupting closes the server, the watcher and the open SQLite file through their scopes.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void EffectEx.runPromise(Fiber.interrupt(fiber)).then(() => process.exit(0)));
}
