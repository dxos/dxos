//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';
import * as Flag from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';
import * as Path from 'effect/Path';

import { QaLintError } from './errors.ts';

/** Names the runner binds itself (qa.mdl Field rule 5 and Input literals), so no test declares them. */
const RUNNER_BOUND = new Set(['given', 'result', 'error', 'spaceId', 'snapshot', 'stepErrors', 'runId']);

export type UnboundReport = { file: string; test: string; unbound: [name: string, line: number][] };

/** `test QA-n` blocks whose steps reference a `$given.x` or `$x` the test never binds. */
export const findUnboundReferences = (file: string, text: string): UnboundReport[] => {
  const lines = text.split('\n');
  // Slice each `test QA-n:` block: starts at the header, ends at the closing fence.
  const tests: { name: string; body: { line: number; text: string }[] }[] = [];
  let current: (typeof tests)[number] | undefined;
  lines.forEach((line, index) => {
    const header = line.match(/^test (QA-\d+):/);
    if (header) {
      current = { name: header[1], body: [] };
      tests.push(current);
    } else if (current && line.startsWith('```')) {
      current = undefined;
    } else if (current) {
      current.body.push({ line: index + 1, text: line });
    }
  });

  return tests.flatMap((test) => {
    const text = test.body.map(({ text }) => text).join('\n');
    // Bound names: `given:` entries written `- name: prose`, and every `capture:`.
    const givens = new Set<string>();
    let inGiven = false;
    for (const { text: line } of test.body) {
      if (/^\s{2}given:/.test(line)) {
        inGiven = true;
        continue;
      }
      if (/^\s{2}\w+[?]?:/.test(line)) {
        inGiven = false;
      }
      const entry = inGiven ? line.match(/^\s*-\s+([A-Za-z_][A-Za-z0-9_]*):\s/) : null;
      if (entry) {
        givens.add(entry[1]);
      }
    }
    const captures = new Set([...text.matchAll(/^\s*capture:\s*([A-Za-z_][A-Za-z0-9_]*)/gm)].map((match) => match[1]));

    const unbound = new Map<string, number>();
    for (const { line, text: content } of test.body) {
      for (const match of content.matchAll(/\$given\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
        if (!givens.has(match[1])) {
          unbound.set(`$given.${match[1]}`, line);
        }
      }
      for (const match of content.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)/g)) {
        if (!RUNNER_BOUND.has(match[1]) && !captures.has(match[1])) {
          unbound.set(`$${match[1]}`, line);
        }
      }
    }
    return unbound.size > 0 ? [{ file, test: test.name, unbound: [...unbound.entries()] }] : [];
  });
};

export type TeardownReport = { file: string; test: string; line: number; reason: string };

/**
 * `after:` steps that could remove an object the run did not create.
 *
 * A teardown is safe when it removes something the test bound itself (a `capture:` or a named `given:`), or resolves
 * by a name the test's `given` guarantees is absent - constrained to the subject's own type, and throwing when nothing
 * matches. Resolving by type-and-index deletes whatever the space happens to hold first; resolving by name across
 * `Filter.everything()` deletes any object carrying that name, which the `given` precondition does not exclude.
 */
export const findUnsafeTeardowns = (file: string, text: string): TeardownReport[] => {
  const lines = text.split('\n');
  const reports: TeardownReport[] = [];
  let inAfter = false;
  let test = '';
  lines.forEach((line, index) => {
    const header = line.match(/^test (QA-\d+):/);
    if (header) {
      test = header[1];
      inAfter = false;
    }
    if (/^ {2}after:/.test(line)) {
      inAfter = true;
      return;
    }
    if (/^ {2}(steps|before|given):/.test(line) || line.startsWith('```')) {
      inAfter = false;
    }
    if (!inAfter || !/removeObjects/.test(line)) {
      return;
    }
    // Only the invoke's own continuation lines - an `assert:` verifying removal legitimately queries the database and
    // must not be mistaken for victim selection.
    const step: string[] = [];
    for (let next = index; next < lines.length; next++) {
      if (next > index && /^\s+(assert|expect|note|do|name|capture):/.test(lines[next])) {
        break;
      }
      step.push(lines[next]);
    }
    const body = step.join('\n');
    if (!/db\.query/.test(body)) {
      return; // Removes a bound value.
    }
    const byIndex = /\.objects\[\d+\]/.test(body);
    const guarded = /throw new Error/.test(body);
    // A name match over every object in the space is not narrowed by a `given` that only promises no *typed* subject
    // carries the name.
    const untyped = /Filter\.everything\(\)/.test(body) && /\.name ===/.test(body);
    // Selecting on an id the test itself produced discriminates even on a dirty fixture, so it needs no name guard
    // (Execution Rule 5).
    const byIdentity = /\.id ===/.test(body);
    if (byIndex || untyped || (!guarded && !byIdentity)) {
      const reason = byIndex ? 'resolves by index' : untyped ? 'name match across every type' : 'unguarded query';
      reports.push({ file, test, line: index + 1, reason });
    }
  });
  return reports;
};

/** The plugin specs the QA lints cover: `packages/plugins/<plugin>/PLUGIN.mdl`, sorted, relative to `root`. */
const pluginSpecs = Effect.fnUntraced(function* (root: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const plugins = (yield* fs.readDirectory(path.join(root, 'packages/plugins'))).sort();
  const specs: { file: string; text: string }[] = [];
  for (const plugin of plugins) {
    const file = `packages/plugins/${plugin}/PLUGIN.mdl`;
    const text = yield* fs.readFileString(path.join(root, file)).pipe(Effect.option);
    if (Option.isSome(text)) {
      specs.push({ file, text: text.value });
    }
  }
  return specs;
});

export type QaCheck = 'unbound' | 'teardown';

export const QA_CHECKS: readonly QaCheck[] = ['unbound', 'teardown'];

/** Runs the QA lints over every plugin spec under `root`; fails when any reports a finding. */
export const lintQa = Effect.fnUntraced(function* ({ root, checks }: { root: string; checks: readonly QaCheck[] }) {
  const specs = yield* pluginSpecs(root);
  let findings = 0;

  if (checks.includes('unbound')) {
    const reports = specs.flatMap(({ file, text }) => findUnboundReferences(file, text));
    let total = 0;
    for (const report of reports) {
      yield* Console.log(`${report.file}  ${report.test}`);
      for (const [name, line] of report.unbound) {
        yield* Console.log(`    L${line}  ${name}`);
        total++;
      }
    }
    yield* Console.log(`\n${reports.length} tests with unbound references; ${total} references total`);
    findings += total;
  }

  if (checks.includes('teardown')) {
    const reports = specs.flatMap(({ file, text }) => findUnsafeTeardowns(file, text));
    for (const { file, test, line, reason } of reports) {
      yield* Console.log(`${file}  ${test}  L${line}  ${reason}`);
    }
    yield* Console.log(`\n${reports.length} teardown step(s) that could remove an object the run did not create`);
    findings += reports.length;
  }

  if (findings > 0) {
    return yield* Effect.fail(new QaLintError({ context: { findings } }));
  }
});

export const qaLint = Command.make(
  'lint',
  {
    check: Flag.Literals('check', QA_CHECKS).pipe(
      Flag.withDescription(
        'Run one check: `unbound` ($references a test never binds) or `teardown` (unsafe `after:` removals).',
      ),
      Flag.optional,
    ),
    root: Flag.String('root').pipe(
      Flag.withDescription('Repository root holding `packages/plugins` (default the working directory).'),
      Flag.withDefault(process.cwd()),
    ),
  },
  ({ check, root }) =>
    lintQa({ root, checks: Option.match(check, { onNone: () => QA_CHECKS, onSome: (one) => [one] }) }),
).pipe(
  Command.withDescription('Lint the `test` blocks of every plugin spec for unbound references and unsafe teardowns.'),
);
