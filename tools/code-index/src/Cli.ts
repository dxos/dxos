//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Argument from 'effect/unstable/cli/Argument';
import * as Command from 'effect/unstable/cli/Command';
import * as Flag from 'effect/unstable/cli/Flag';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Crawler from './Crawler.ts';
import * as Indexer from './Indexer.ts';
import * as Ontology from './Ontology.ts';
import * as Store from './Store.ts';

/**
 * The `code-index` command surface. Every command runs against one store, which defaults to
 * `<git root>/node_modules/.code-index` for the repository containing the working directory.
 */

/** Bundled N3 rule set; read its header before adding rules of your own. */
export const DEFAULT_RULES = fileURLToPath(new URL('../rules/example.n3', import.meta.url));

const rootFlag = Flag.string('root').pipe(
  Flag.withDescription('Repository root to index (default: the git root of the working directory).'),
  Flag.optional,
);

const storeFlag = Flag.string('store').pipe(
  Flag.withDescription('Store directory (default: <root>/node_modules/.code-index).'),
  Flag.optional,
);

const jsonFlag = Flag.boolean('json').pipe(Flag.withDescription('Emit JSON.'));

/** Both defaults come from git, so the same store is found from anywhere inside the repository. */
const resolveRoot = (root: Option.Option<string>): Effect.Effect<string, Crawler.CrawlError> =>
  Option.match(root, { onNone: () => Crawler.gitRoot(), onSome: (value) => Effect.succeed(resolve(value)) });

const storeLayer = (root: string, dir: Option.Option<string>) =>
  Store.layer(Option.match(dir, { onNone: () => Crawler.storeDir(root), onSome: resolve }));

const emit = (json: boolean, value: unknown, text: () => string): Effect.Effect<void> =>
  Console.log(json ? JSON.stringify(value, null, 2) : text());

const seconds = (ms: number): string => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);

const index = Command.make(
  'index',
  {
    root: rootFlag,
    store: storeFlag,
    json: jsonFlag,
    force: Flag.boolean('force').pipe(Flag.withDescription('Reindex every file, ignoring recorded mtimes.')),
    workers: Flag.integer('workers').pipe(Flag.withDescription('Parsing workers.'), Flag.optional),
    rules: Flag.string('rules').pipe(
      Flag.withDescription('N3 rules recomputed at the end of the pass (default: bundled rules/example.n3).'),
      Flag.optional,
    ),
    noReason: Flag.boolean('no-reason').pipe(Flag.withDescription('Skip the reasoning phase.')),
  },
  ({ root, store, json, force, workers, rules, noReason }) =>
    Effect.gen(function* () {
      const repo = yield* resolveRoot(root);
      const rulesPath = resolve(Option.getOrElse(rules, () => DEFAULT_RULES));
      const source = noReason
        ? undefined
        : yield* Effect.tryPromise({
            try: () => readFile(rulesPath, 'utf8'),
            catch: (cause) => new Store.StoreError({ message: `Cannot read rules file: ${rulesPath}`, cause }),
          });
      const result = yield* Indexer.run({
        root: repo,
        force,
        rules: source,
        workers: Option.getOrUndefined(workers),
      }).pipe(Effect.provide(storeLayer(repo, store)));
      const { timings } = result;
      yield* emit(json, result, () =>
        [
          `${result.root}: ${result.indexed} indexed, ${result.unchanged} unchanged, ${result.removed} removed` +
            (result.skipped.length > 0 ? `, ${result.skipped.length} skipped` : '') +
            (noReason ? '' : `, ${result.derived} derived`),
          `scan ${seconds(timings.scanMs)} · parse ${seconds(timings.parseMs)} · commit ${seconds(timings.commitMs)}` +
            ` · reason ${result.reasoned ? seconds(timings.reasonMs) : 'skipped'} · total ${seconds(timings.totalMs)}`,
        ].join('\n'),
      );
    }),
).pipe(Command.withDescription('Index the repository (incremental — only files whose mtime changed).'));

const withStore = <A, E, R>(
  root: Option.Option<string>,
  store: Option.Option<string>,
  body: (store: Store.Api) => Effect.Effect<A, E, R>,
) =>
  Effect.gen(function* () {
    const repo = yield* resolveRoot(root);
    return yield* Effect.flatMap(Store.Store, body).pipe(Effect.provide(storeLayer(repo, store)));
  });

const files = Command.make(
  'files',
  { root: rootFlag, store: storeFlag, json: jsonFlag, lang: Flag.string('lang').pipe(Flag.optional) },
  ({ root, store, json, lang }) =>
    withStore(root, store, (api) =>
      Effect.gen(function* () {
        const found = yield* api.listFiles({ language: Option.getOrUndefined(lang) });
        yield* emit(json, found, () =>
          found.map((file) => `${file.language.padEnd(12)} ${file.path}  ${file.hash.slice(0, 8)}`).join('\n'),
        );
      }),
    ),
).pipe(Command.withDescription('List indexed files.'));

const readQuery = (query: string, fromFile: boolean): Effect.Effect<string, Store.StoreError> =>
  fromFile
    ? Effect.tryPromise({
        try: () => readFile(query, 'utf8'),
        catch: (cause) => new Store.StoreError({ message: `Cannot read query file: ${query}`, cause }),
      })
    : Effect.succeed(query);

const query = Command.make(
  'query',
  {
    query: Argument.string('sparql'),
    root: rootFlag,
    store: storeFlag,
    json: jsonFlag,
    file: Flag.boolean('file').pipe(Flag.withDescription('Read the query from a file.')),
  },
  ({ query, root, store, json, file }) =>
    withStore(root, store, (api) =>
      Effect.gen(function* () {
        const rows = yield* Effect.flatMap(readQuery(query, file), api.select);
        yield* emit(json, rows, () =>
          rows
            .map((row) =>
              Object.entries(row)
                .map(([key, value]) => `${key}=${value}`)
                .join('\t'),
            )
            .join('\n'),
        );
      }),
    ),
).pipe(Command.withDescription('Run a SPARQL SELECT.'));

const ask = Command.make(
  'ask',
  {
    query: Argument.string('sparql'),
    root: rootFlag,
    store: storeFlag,
    json: jsonFlag,
    file: Flag.boolean('file'),
  },
  ({ query, root, store, json, file }) =>
    withStore(root, store, (api) =>
      Effect.gen(function* () {
        const result = yield* Effect.flatMap(readQuery(query, file), api.ask);
        yield* emit(json, result, () => String(result));
      }),
    ),
).pipe(Command.withDescription('Run a SPARQL ASK.'));

const dump = Command.make('dump', { root: rootFlag, store: storeFlag }, ({ root, store }) =>
  withStore(root, store, (api) => Effect.flatMap(api.dump(), Console.log)),
).pipe(Command.withDescription('Serialize the graph as N3.'));

const stats = Command.make('stats', { root: rootFlag, store: storeFlag, json: jsonFlag }, ({ root, store, json }) =>
  withStore(root, store, (api) =>
    Effect.flatMap(api.stats(), (result) =>
      emit(json, result, () => `${result.dir}: ${result.files} files, ${result.quads} quads`),
    ),
  ),
).pipe(Command.withDescription('Row and quad counts.'));

const clear = Command.make('clear', { root: rootFlag, store: storeFlag }, ({ root, store }) =>
  withStore(root, store, (api) => Effect.flatMap(api.clear(), () => Console.log('Store cleared'))),
).pipe(Command.withDescription('Empty the store.'));

const ontology = Command.make('ontology', { json: jsonFlag }, ({ json }) =>
  emit(json, Ontology.CONTEXT, () => JSON.stringify(Ontology.CONTEXT, null, 2)),
).pipe(Command.withDescription('Print the JSON-LD context the indexer emits.'));

export const command = Command.make('code-index').pipe(
  Command.withDescription('Index a codebase into SQLite + RDF (DEUS ontology).'),
  Command.withSubcommands([index, files, query, ask, dump, stats, clear, ontology]),
);

/** Runs one command; `Layer.launch` is not involved — every command opens and closes its own store. */
export const run = Command.runWith(command, { version: '0.11.1' });
