//
// Copyright 2026 DXOS.org
//

// Fact server (node): serves the RDF fact store crawl-demo persisted over HTTP, so a browser story (stories-brain
// `FactExplorer`) can explore it through `FactStoreHttp`. Runs until interrupted.
//   [DISCORD_FACTS_DB=path] [DISCORD_FACT_SERVER_PORT=7700]  moon run plugin-discord:fact-server

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as EffectEx from '@dxos/effect/EffectEx';
import { FactStore, FactStoreLive } from '@dxos/pipeline-rdf';
import { serveFactStore } from '@dxos/pipeline-rdf/testing';

const factsPath = process.env.DISCORD_FACTS_DB ?? join(tmpdir(), 'dxos-discord-facts.db');
const port = Number(process.env.DISCORD_FACT_SERVER_PORT ?? 7700);

if (!existsSync(factsPath)) {
  console.error(`No fact store at ${factsPath}; run plugin-discord:crawl-demo first or set DISCORD_FACTS_DB.`);
  process.exit(1);
}

const program = Effect.scoped(
  Effect.gen(function* () {
    const store = yield* FactStore;
    const { url } = yield* serveFactStore(store, { port });
    const facts = yield* store.query({});
    console.log(`Serving ${facts.length} facts from ${factsPath}`);
    console.log(`  ${url}   (storybook: stories-brain › FactExplorer)`);
    return yield* Effect.never;
  }),
).pipe(Effect.provide(FactStoreLive.layerFile(factsPath)));

const fiber = Effect.runFork(program);
// Interrupting closes the server and the SQLite file through their scopes.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void EffectEx.runPromise(Fiber.interrupt(fiber)).then(() => process.exit(0)));
}
