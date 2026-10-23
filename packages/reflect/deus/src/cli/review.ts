//
// Copyright 2026 DXOS.org
//

import * as Argument from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { ReviewCheckError } from './errors.ts';
import { git } from './git.ts';

const STATUSES = new Set(['done', 'untested', 'partial', 'diverged', 'missing']);

/** Kinds a review judges. Acceptance blocks (scenarios, QA tests) are run, not reviewed; history is not code. */
const REVIEWED_KINDS = new Set([
  'plugin',
  'feat',
  'req',
  'type',
  'op',
  'component',
  'service',
  'capability',
  'module',
  'db',
  'scenario',
  'test',
]);

/** Kinds judged on whether automation exercises them rather than on whether code implements them. */
const EXERCISE_KINDS = new Set(['scenario', 'test']);

/** A key list written inline (`[a, b]`), wrapped over lines, or as `- a` items, as `parseReview` reads it. */
const keyList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[,\n]/)
    .map((item) => item.replace(/^[\s[-]+|[\s\]]+$/g, ''))
    .filter(Boolean);

export type ReviewItem = { id: string; kind: string; line: number; title: string };

const blocks = (text: string): { body: string; line: number }[] =>
  [...text.matchAll(/^```mdl\s*\n([\s\S]*?)^```/gm)].map((match) => ({
    body: match[1],
    line: text.slice(0, match.index).split('\n').length + 1,
  }));

/** Top-level blocks, plus `req` items nested in a `feat`; a feat with reqs is judged through them. */
export const reviewItems = (text: string): ReviewItem[] =>
  blocks(text).flatMap(({ body, line }) => {
    const lines = body.split('\n');
    const header = lines[0].match(/^(\w+)\s+([A-Za-z][\w.-]*)\s*(?::\s*(.*))?$/);
    if (!header || !REVIEWED_KINDS.has(header[1])) {
      return [];
    }
    const reqs = lines.flatMap((text, offset) => {
      const req = text.match(/^\s+req\s+([A-Za-z][\w.-]*)\s*:\s*(.*)$/);
      return req ? [{ id: req[1], kind: 'req', line: line + offset, title: req[2] }] : [];
    });
    return reqs.length > 0 ? reqs : [{ id: header[2], kind: header[1], line, title: header[3] ?? '' }];
  });

const frontmatter = (text: string): Record<string, string> =>
  Object.fromEntries(
    (text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').split('\n').flatMap((line) => {
      const match = line.match(/^([\w-]+):\s*(.*?)\s*(?:#.*)?$/);
      return match ? [[match[1], match[2]]] : [];
    }),
  );

const field = (body: string, name: string): string | undefined => {
  const match = body.match(new RegExp(`^  ${name}:[ \\t]*(.*)$((?:\\n {4,}.*)*)`, 'm'));
  return match ? `${match[1]} ${match[2]}`.replace(/^\|/, '').trim() : undefined;
};

/** Whether the source declares the name: a top-level declaration, a member, or an export list entry. */
const declares = (source: string, name: string): boolean => {
  const id = name.replace(/[$]/g, '\\$');
  return [
    new RegExp(`(?:class|interface|type|enum|function\\*?|const|let|var|namespace)\\s+${id}\\b`),
    new RegExp(
      `^\\s*(?:(?:public|private|protected|static|readonly|override|async|get|set|#)\\s*)*${id}\\s*\\??[:(<=]`,
      'm',
    ),
    new RegExp(`export\\s*\\{[^}]*\\b${id}\\b`),
  ].some((pattern) => pattern.test(source));
};

type ResolvedKey = { file?: string; symbol?: string; error?: string };

/**
 * Validates a `.review.mdl` against its spec and the checkout: frontmatter, statuses, notes, coverage of every item,
 * and that each evidence key names an existing file and symbol.
 */
export const checkReview = Effect.fnUntraced(function* (reviewPath: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = yield* fs.readFileString(reviewPath);
  const meta = frontmatter(text);
  for (const key of ['spec', 'commit', 'date', 'by']) {
    if (!meta[key]) {
      errors.push(`frontmatter: missing \`${key}\``);
    }
  }
  if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) {
    errors.push('frontmatter: `date` must be YYYY-MM-DD');
  }
  if (meta.by && !/^(user|agent):\S+$/.test(meta.by)) {
    errors.push('frontmatter: `by` must be `user:<handle>` or `agent:<name>`');
  }

  const root = yield* git(path.dirname(path.resolve(reviewPath)), 'rev-parse', '--show-toplevel');
  const realRoot = yield* fs.realPath(root);
  const repo = Option.getOrUndefined(
    yield* git(root, 'remote', 'get-url', 'origin').pipe(
      Effect.option,
      Effect.map(Option.flatMapNullishOr((url) => url.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/)?.[1])),
    ),
  );
  if (meta.commit && Option.isNone(yield* git(root, 'cat-file', '-e', `${meta.commit}^{commit}`).pipe(Effect.option))) {
    warnings.push(`frontmatter: commit ${meta.commit} is not in this clone (shallow, or not fetched)`);
  }

  const exists = (file: string) => fs.exists(file).pipe(Effect.orElseSucceed(() => false));
  const resolveKey = Effect.fnUntraced(function* (key: string) {
    const match = key.match(/^github:([\w.-]+\/[\w.-]+)\/([^#\s]+)(?:#([\w$.-]+))?$/);
    if (!match) {
      return { error: `not a github: key: ${key}` } satisfies ResolvedKey;
    }
    if (repo && match[1].toLowerCase() !== repo.toLowerCase()) {
      return {} satisfies ResolvedKey;
    }
    const file = path.resolve(root, match[2]);
    // A key names a file inside the checkout; neither `..` nor a symlink may reach outside it.
    const real = (yield* exists(file)) ? yield* fs.realPath(file) : file;
    if (match[2].split('/').includes('..') || !real.startsWith(`${realRoot}${path.sep}`)) {
      return { error: `key leaves the checkout: ${key}` } satisfies ResolvedKey;
    }
    return { file, symbol: match[3] } satisfies ResolvedKey;
  });

  const specFile = meta.spec ? (yield* resolveKey(meta.spec)).file : undefined;
  const specText = specFile && (yield* exists(specFile)) ? yield* fs.readFileString(specFile) : undefined;
  if (meta.spec && !specText) {
    errors.push(`frontmatter: spec not found in this checkout: ${meta.spec}`);
  }
  const items = specText ? reviewItems(specText) : [];
  const itemIds = new Set(items.map(({ id }) => id));
  const kindOf = new Map(items.map(({ id, kind }) => [id, kind]));

  const verdicts = blocks(text).flatMap(({ body, line }) => {
    const header = body.split('\n')[0].match(/^verdict\s+([A-Za-z][\w.-]*)\s*(?::\s*(.*))?$/);
    return header ? [{ id: header[1], line, body }] : [];
  });
  const seen = new Set<string>();
  for (const { id, line, body } of verdicts) {
    const at = `${reviewPath}:${line}`;
    if (seen.has(id)) {
      errors.push(`${at}: second verdict for ${id}`);
    }
    seen.add(id);
    if (specText && !itemIds.has(id)) {
      errors.push(`${at}: ${id} is not a reviewable item of the spec (run \`items\` for the list)`);
    }
    const status = field(body, 'status');
    if (!status || !STATUSES.has(status)) {
      errors.push(`${at}: ${id} has status \`${status ?? ''}\`; use one of ${[...STATUSES].join(', ')}`);
    }
    if (status && status !== 'done' && !field(body, 'note')) {
      errors.push(`${at}: ${id} is ${status} but has no note saying what is missing or different`);
    }
    const exercise = EXERCISE_KINDS.has(kindOf.get(id) ?? '');
    const evidence = keyList(field(body, 'evidence'));
    if (!exercise && (status === 'done' || status === 'untested' || status === 'partial') && evidence.length === 0) {
      warnings.push(`${at}: ${id} is ${status} with no evidence`);
    }
    for (const key of evidence) {
      const { file, symbol, error } = yield* resolveKey(key);
      if (error) {
        errors.push(`${at}: ${error}`);
      } else if (file && !(yield* exists(file))) {
        errors.push(`${at}: evidence file not found: ${key}`);
      } else if (file && symbol) {
        if (!declares(yield* fs.readFileString(file), symbol.split('.').pop() ?? symbol)) {
          errors.push(`${at}: no declaration of ${symbol} in ${key.split('#')[0]} (a mention is not evidence)`);
        }
      }
    }
    const tests = keyList(field(body, 'tests'));
    if (exercise && status === 'untested') {
      errors.push(`${at}: ${id} is a ${kindOf.get(id)}; use done, partial, diverged or missing (see lang/review.mdl)`);
    }
    if (exercise && status !== 'missing' && tests.length === 0) {
      errors.push(`${at}: ${id} is a ${kindOf.get(id)} judged ${status} but cites no tests`);
    }
    if (status === 'untested' && tests.length > 0) {
      errors.push(`${at}: ${id} is untested but cites tests; make it done or drop the tests`);
    }
    if (!exercise && status === 'done' && tests.length === 0) {
      warnings.push(`${at}: ${id} is done with no tests; cite them or make it untested`);
    }
    for (const key of tests) {
      const { file, symbol, error } = yield* resolveKey(key);
      if (error) {
        errors.push(`${at}: ${error}`);
      } else if (symbol) {
        errors.push(`${at}: a test key names the test file only, without #: ${key}`);
      } else if (file && !(yield* exists(file))) {
        errors.push(`${at}: test file not found: ${key}`);
      }
    }
  }
  for (const { id, line } of items) {
    if (!seen.has(id)) {
      errors.push(`${specFile}:${line}: ${id} has no verdict`);
    }
  }

  for (const warning of warnings) {
    yield* Console.log(`warning: ${warning}`);
  }
  for (const error of errors) {
    yield* Console.log(`error: ${error}`);
  }
  yield* Console.log(
    `${verdicts.length} verdicts for ${items.length} items; ${errors.length} errors, ${warnings.length} warnings.`,
  );
  if (errors.length > 0) {
    return yield* Effect.fail(new ReviewCheckError({ context: { errors: errors.length } }));
  }
});

const items = Command.make(
  'items',
  { spec: Argument.String('spec').pipe(Argument.withDescription('The spec (.mdl) to list.')) },
  Effect.fnUntraced(function* ({ spec }) {
    const fs = yield* FileSystem.FileSystem;
    for (const { id, kind, line, title } of reviewItems(yield* fs.readFileString(spec))) {
      yield* Console.log(`${id}\t${kind}\t${line}\t${title}`);
    }
  }),
).pipe(Command.withDescription('List every item a spec review must judge: `<id>\\t<kind>\\t<line>\\t<title>`.'));

const check = Command.make(
  'check',
  { review: Argument.String('review').pipe(Argument.withDescription('The review (.review.mdl) to validate.')) },
  ({ review }) => checkReview(review),
).pipe(Command.withDescription('Validate a spec review against its spec and the checkout.'));

export const review = Command.make('review').pipe(
  Command.withDescription('Spec review tools.'),
  Command.withSubcommands([items, check]),
);
