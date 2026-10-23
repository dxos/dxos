//
// Copyright 2026 DXOS.org
//

// Helpers for the spec-review skill. Imports nothing beyond node:*, so it runs with plain `node`.
//
//   node .agents/skills/spec-review/scripts/review.mts items <spec.mdl>
//     Lists every item a review must judge, one per line: `<id>\t<kind>\t<line>\t<title>`.
//
//   node .agents/skills/spec-review/scripts/review.mts check <spec.review.mdl>
//     Validates a review against its spec and the checkout: frontmatter, statuses, notes,
//     coverage of every item, and that each evidence key names an existing file and symbol.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

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

type Item = { id: string; kind: string; line: number; title: string };

const blocks = (text: string): { body: string; line: number }[] =>
  [...text.matchAll(/^```mdl\s*\n([\s\S]*?)^```/gm)].map((match) => ({
    body: match[1],
    line: text.slice(0, match.index).split('\n').length + 1,
  }));

/** Top-level blocks, plus `req` items nested in a `feat`; a feat with reqs is judged through them. */
const reviewItems = (text: string): Item[] =>
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

const repoRoot = (from: string): string =>
  execFileSync('git', ['-C', from, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

const repoId = (root: string): string | undefined => {
  try {
    const url = execFileSync('git', ['-C', root, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
    return url.match(/github\.com[:/]([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/)?.[1];
  } catch {
    return undefined;
  }
};

const check = (reviewPath: string): number => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const text = readFileSync(reviewPath, 'utf8');
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

  const root = repoRoot(path.dirname(path.resolve(reviewPath)));
  const repo = repoId(root);
  if (meta.commit) {
    try {
      execFileSync('git', ['-C', root, 'cat-file', '-e', `${meta.commit}^{commit}`], { stdio: 'ignore' });
    } catch {
      warnings.push(`frontmatter: commit ${meta.commit} is not in this clone (shallow, or not fetched)`);
    }
  }
  const resolveKey = (key: string): { file?: string; symbol?: string; error?: string } => {
    const match = key.match(/^github:([\w.-]+\/[\w.-]+)\/([^#\s]+)(?:#([\w$.-]+))?$/);
    if (!match) {
      return { error: `not a github: key: ${key}` };
    }
    if (repo && match[1].toLowerCase() !== repo.toLowerCase()) {
      return {};
    }
    const file = path.resolve(root, match[2]);
    // A key names a file inside the checkout; neither `..` nor a symlink may reach outside it.
    const real = existsSync(file) ? realpathSync(file) : file;
    if (match[2].split('/').includes('..') || !real.startsWith(`${realpathSync(root)}${path.sep}`)) {
      return { error: `key leaves the checkout: ${key}` };
    }
    return { file, symbol: match[3] };
  };

  const specFile = meta.spec && resolveKey(meta.spec).file;
  const specText = specFile && existsSync(specFile) ? readFileSync(specFile, 'utf8') : undefined;
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
      const { file, symbol, error } = resolveKey(key);
      if (error) {
        errors.push(`${at}: ${error}`);
      } else if (file && !existsSync(file)) {
        errors.push(`${at}: evidence file not found: ${key}`);
      } else if (file && symbol) {
        if (!declares(readFileSync(file, 'utf8'), symbol.split('.').pop() ?? symbol)) {
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
      const { file, symbol, error } = resolveKey(key);
      if (error) {
        errors.push(`${at}: ${error}`);
      } else if (symbol) {
        errors.push(`${at}: a test key names the test file only, without #: ${key}`);
      } else if (file && !existsSync(file)) {
        errors.push(`${at}: test file not found: ${key}`);
      }
    }
  }
  for (const { id, line } of items) {
    if (!seen.has(id)) {
      errors.push(`${specFile}:${line}: ${id} has no verdict`);
    }
  }

  warnings.forEach((warning) => console.log(`warning: ${warning}`));
  errors.forEach((error) => console.log(`error: ${error}`));
  console.log(
    `${verdicts.length} verdicts for ${items.length} items; ${errors.length} errors, ${warnings.length} warnings.`,
  );
  return errors.length > 0 ? 1 : 0;
};

const [command, file] = process.argv.slice(2);
if (command === 'items' && file) {
  for (const { id, kind, line, title } of reviewItems(readFileSync(file, 'utf8'))) {
    console.log(`${id}\t${kind}\t${line}\t${title}`);
  }
} else if (command === 'check' && file) {
  process.exit(check(file));
} else {
  console.error('usage: review.mts items <spec.mdl> | check <spec.review.mdl>');
  process.exit(2);
}
