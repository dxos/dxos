//
// Copyright 2026 DXOS.org
//

import * as Argument from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Flag from 'effect/cli/Flag';
import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { qaLint } from './qa-lint.ts';

/**
 * Whether a host CLI asked for JSON output. `dx` declares `--json` as a shared root flag, which consumes it before
 * `dx deus qa list` sees its own, so `dx` provides this instead.
 */
export const JsonOutput: Context.Reference<boolean> = Context.Reference<boolean>('@dxos/deus/JsonOutput', {
  defaultValue: () => false,
});

// Enumerates the executable `test QA-n` blocks and the `suite` blocks that group them across the repo's `.mdl` specs
// (the Deus.QA dialect, `lang/qa.mdl`). Deliberately regex-based rather than a real parser: the block grammar is still
// settling, and a listing that breaks on an unparsed field is worse than one that reports what it found.

/** Directories never searched; `__fixtures__` hold test inputs, not runnable plans. */
const SKIP = new Set(['node_modules', 'dist', '.git', '.moon', 'out', 'temp', '.cache', '__fixtures__']);

const STAGES = ['before', 'steps', 'after'] as const;

type Stage = (typeof STAGES)[number];

export type StageCounts = Record<Stage, number>;

export type QaTest = {
  file: string;
  plugin: string;
  id: string;
  title: string;
  status: string;
  actors: string;
  /** Per stage, so a partial run's size is visible; `steps` is the test, the other two are fixture. */
  stages: StageCounts;
  covers: string;
  tags: string[];
};

export type TestRef = { plugin: string; id: string };

export type QaSuite = {
  file: string;
  plugin: string;
  id: string;
  title: string;
  tags: string[];
  tests: TestRef[];
};

export type QaDocument = { file: string; text: string };

type Block = { file: string; plugin: string; id: string; title: string; body: string };

/** Steps per stage. A stage header sits at two spaces; its steps are `- name:`/`- do:` at four. */
const countStages = (body: string): StageCounts => {
  const counts: StageCounts = { before: 0, steps: 0, after: 0 };
  let stage: Stage | undefined;
  for (const line of body.split('\n')) {
    const header = line.match(/^ {2}(\w+):\s*$/);
    if (header) {
      stage = STAGES.find((candidate) => candidate === header[1]);
      continue;
    }
    if (stage && /^ {4}- +(?:name|do):/.test(line)) {
      counts[stage]++;
    }
  }
  return counts;
};

/** The short name a test or suite is addressed by: `markdown` for plugin-markdown, `app` for APP.mdl. */
export const shortName = (file: string): string =>
  file.match(/plugin-([\w-]+)\//)?.[1] ?? (file.endsWith('APP.mdl') ? 'app' : file.replace(/\.mdl$/, ''));

const parseList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** Blocks of one kind in a document. Several blocks may share one fence, so headers are matched per line. */
const parseBlocks = (text: string, file: string, kind: string): Block[] =>
  [...text.matchAll(/```mdl\n([\s\S]*?)```/g)].flatMap(([, fence]) => {
    const headers = [...fence.matchAll(new RegExp(`^${kind}\\s+([\\w.-]+)\\s*(?::\\s*(.*))?$`, 'gm'))];
    return headers.map((header, index) => ({
      file,
      plugin: shortName(file),
      id: header[1],
      title: (header[2] ?? '').trim(),
      body: fence.slice(header.index, headers[index + 1]?.index ?? fence.length),
    }));
  });

export const parseTests = (text: string, file: string): QaTest[] =>
  parseBlocks(text, file, 'test').map(({ body, ...block }) => ({
    ...block,
    status: body.match(/^\s*status:\s*(\w+)/m)?.[1] ?? 'unverified',
    actors: body.match(/^\s*actors:\s*([\w|\s]+?)\s*$/m)?.[1]?.trim() ?? 'both',
    stages: countStages(body),
    covers: body.match(/^\s*covers:\s*\[(.*?)\]/m)?.[1] ?? '',
    tags: parseList(body.match(/^\s*tags:\s*\[(.*?)\]/m)?.[1]),
  }));

export const parseSuites = (text: string, file: string): QaSuite[] =>
  parseBlocks(text, file, 'suite').map(({ body, ...block }) => ({
    ...block,
    tags: parseList(body.match(/^\s*tags:\s*\[(.*?)\]/m)?.[1]),
    // A bare `QA-1` is this document's test; `markdown:QA-1` names another plugin's.
    tests: parseList(body.match(/^\s*tests:\s*\[(.*?)\]/m)?.[1]).map((ref) => {
      const [plugin, id] = ref.includes(':') ? ref.split(':') : [block.plugin, ref];
      return { plugin, id };
    }),
  }));

/**
 * A dialect definition (`org.dxos.spec.*`) carries example tests to document its own syntax; those are illustrations,
 * not plans, and listing them as runnable is a trap.
 */
export const isDialect = (text: string): boolean => /^id:\s*org\.dxos\.spec\./m.test(text.split('---')[1] ?? '');

export type QaQuery = {
  /** `[<plugin> <testId>]` resolves exactly; a single value is a substring filter over path, id and title. */
  query: readonly string[];
  tag: Option.Option<string>;
  suite: Option.Option<string>;
  suites: boolean;
};

export type QaSelection = { kind: 'tests'; rows: QaTest[] } | { kind: 'suites'; rows: QaSuite[] };

/** The tests a suite names, in its order; a ref that resolves to nothing is reported as `missing`, not dropped. */
const resolveSuite = (tests: QaTest[], suite: QaSuite): QaTest[] =>
  suite.tests.map(
    (ref) =>
      tests.find((candidate) => candidate.plugin === ref.plugin && candidate.id === ref.id) ?? {
        file: suite.file,
        plugin: ref.plugin,
        id: ref.id,
        title: '(unresolved)',
        status: 'missing',
        actors: 'both',
        stages: { before: 0, steps: 0, after: 0 },
        covers: '',
        tags: [],
      },
  );

/** Selects the tests (or suites) a query names from the parsed documents. */
export const selectQa = (documents: readonly QaDocument[], { query, tag, suite, suites: listSuites }: QaQuery) => {
  const specs = documents.filter(({ text }) => !isDialect(text));
  const tests = specs.flatMap(({ file, text }) => parseTests(text, file));
  const suites = specs.flatMap(({ file, text }) => parseSuites(text, file));

  // Two positionals resolve exactly — `<plugin> <testId>`. One is the loose substring filter, and a test id alone is
  // genuinely ambiguous: QA-1 exists in more than one plugin.
  const [plugin, testId] = query.length >= 2 ? query : [undefined, undefined];
  const filter = query.length >= 2 ? undefined : query[0];
  const matchesPlugin = (item: { plugin: string }) => !plugin || item.plugin === plugin.replace(/^plugin-/, '');
  const matchesFilter = (item: { file: string; id: string; title: string }) =>
    !filter || `${item.file} ${item.id} ${item.title}`.toLowerCase().includes(filter.toLowerCase());

  let selectedSuites = suites.filter(matchesPlugin).filter(matchesFilter);
  if (Option.isSome(tag)) {
    selectedSuites = suites.filter((candidate) => candidate.tags.includes(tag.value));
  }
  if (Option.isSome(suite)) {
    selectedSuites = suites.filter((candidate) => candidate.id === suite.value);
  }

  const description = plugin
    ? `${plugin} ${testId}`
    : (filter ?? Option.getOrUndefined(tag) ?? Option.getOrUndefined(suite));
  if (listSuites) {
    return { selection: { kind: 'suites', rows: selectedSuites } satisfies QaSelection, description };
  }
  if (Option.isSome(tag) || Option.isSome(suite)) {
    // Suites are order-independent by construction (each test owns its fixture), so a tag's union is simply every
    // member test, de-duplicated, in suite order.
    const seen = new Set<string>();
    const rows = selectedSuites
      .flatMap((candidate) => resolveSuite(tests, candidate))
      .filter((test) => {
        const key = `${test.plugin}:${test.id}`;
        return seen.has(key) ? false : (seen.add(key), true);
      });
    return { selection: { kind: 'tests', rows } satisfies QaSelection, description };
  }
  const rows = tests
    .filter(matchesPlugin)
    .filter(matchesFilter)
    .filter((test) => !testId || test.id.toLowerCase() === testId.toLowerCase());
  return { selection: { kind: 'tests', rows } satisfies QaSelection, description };
};

/** The numbered table `/dxos:qa` renders; row numbers are the addressing scheme. */
export const formatSelection = (selection: QaSelection, description: string | undefined): string[] => {
  const noun = selection.kind;
  if (selection.rows.length === 0) {
    return [description ? `No ${noun} matching "${description}".` : `No ${noun} found.`];
  }
  if (selection.kind === 'suites') {
    const width = Math.max(...selection.rows.map((suite) => suite.id.length));
    return selection.rows.flatMap((suite, index) => [
      `${String(index + 1).padStart(2)}. ${suite.id.padEnd(width)}  ${String(suite.tests.length).padStart(2)} tests  ${suite.title}`,
      `    ${suite.file}${suite.tags.length ? `  tags: ${suite.tags.join(', ')}` : ''}`,
    ]);
  }
  const idWidth = Math.max(...selection.rows.map((test) => test.id.length));
  const statusWidth = Math.max(...selection.rows.map((test) => test.status.length));
  return selection.rows.flatMap((test, index) => {
    const { before, steps, after } = test.stages;
    return [
      `${String(index + 1).padStart(2)}. ${test.plugin}:${test.id.padEnd(idWidth)}  ${test.status.padEnd(statusWidth)}  ` +
        `${String(steps).padStart(2)} steps (${before} before, ${after} after)  ${test.title}`,
      `    ${test.file}${test.covers ? `  covers: ${test.covers}` : ''}`,
    ];
  });
};

/** Every `.mdl` file under `root`, sorted, with paths relative to it; broken symlinks are skipped. */
export const readDocuments = Effect.fnUntraced(function* (root: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const walk = (dir: string): Effect.Effect<string[]> =>
    Effect.gen(function* () {
      // Sorted: the row numbers are the addressing scheme, and readdir order is filesystem-defined.
      const entries = (yield* fs.readDirectory(dir).pipe(Effect.orElseSucceed((): string[] => []))).sort();
      const files: string[] = [];
      for (const entry of entries) {
        if (SKIP.has(entry)) {
          continue;
        }
        const full = path.join(dir, entry);
        const info = yield* fs.stat(full).pipe(Effect.option);
        if (Option.isNone(info)) {
          continue;
        }
        if (info.value.type === 'Directory') {
          files.push(...(yield* walk(full)));
        } else if (entry.endsWith('.mdl')) {
          files.push(full);
        }
      }
      return files;
    });

  const files = yield* walk(root);
  return yield* Effect.forEach(files, (file) =>
    fs.readFileString(file).pipe(Effect.map((text): QaDocument => ({ file: path.relative(root, file), text }))),
  );
});

const list = Command.make(
  'list',
  {
    query: Argument.String('query').pipe(
      Argument.withDescription(
        '`<plugin> <testId>` for exactly one test (`markdown QA-1`, `app QA-1`), or a substring filter.',
      ),
      Argument.variadic({ max: 2 }),
    ),
    tag: Flag.String('tag').pipe(Flag.withDescription('The tests of every suite carrying this tag.'), Flag.optional),
    suite: Flag.String('suite').pipe(Flag.withDescription('The tests of one suite, in its order.'), Flag.optional),
    suites: Flag.Boolean('suites').pipe(Flag.withDescription('List suites instead of tests.'), Flag.withDefault(false)),
    json: Flag.Boolean('json').pipe(Flag.withDescription('Print the rows as JSON.'), Flag.withDefault(false)),
    root: Flag.String('root').pipe(
      Flag.withDescription('Directory to search (env DX_REPO_ROOT; default the working directory).'),
      Flag.withFallbackConfig(Config.String('DX_REPO_ROOT')),
      Flag.withDefault(process.cwd()),
    ),
  },
  Effect.fnUntraced(function* ({ json, root, ...query }) {
    const { selection, description } = selectQa(yield* readDocuments(root), query);
    if (json || (yield* JsonOutput)) {
      yield* Console.log(JSON.stringify(selection.rows, null, 2));
      return;
    }
    for (const line of formatSelection(selection, description)) {
      yield* Console.log(line);
    }
  }),
).pipe(Command.withDescription('List the executable `test` and `suite` blocks across the .mdl specs, numbered.'));

export const qa = Command.make('qa').pipe(
  Command.withDescription('Deus.QA tools.'),
  Command.withSubcommands([list, qaLint]),
);
