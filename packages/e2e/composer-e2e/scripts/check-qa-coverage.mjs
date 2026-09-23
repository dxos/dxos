#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

/**
 * Checks that every Playwright test in this package names an `.mdl` QA flow, and that every flow's
 * `automated:` entry names a test that exists.
 *
 *   node packages/e2e/composer-e2e/scripts/check-qa-coverage.mjs
 *
 * The binding is declared twice — a `@QA-n` Playwright tag on the test, an `automated:` entry on
 * the `test QA-n` block — and this is what makes the duplication worth having. A one-sided link
 * rots silently: rename a test and the suite stays green while the flow it claimed to cover stops
 * being exercised, which is exactly the state the `automated:` field exists to make impossible.
 *
 * Deliberately a regex reader rather than an mdl parser: the two fields it needs are line-oriented,
 * and a check that fails to run is worse than one that is approximate. It reads ONLY `automated:`
 * blocks, so nothing else about the dialect can break it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const PACKAGE_DIR = path.resolve(import.meta.dirname, '..');

const WORKSPACE_ROOT = path.resolve(PACKAGE_DIR, '../../..');

const SPEC_DIR = path.join(PACKAGE_DIR, 'src/playwright');

/** This package's name as an `automated:` entry spells it. */
const PACKAGE = 'composer-e2e';

/** Where a `@<prefix>:QA-n` tag's flow is expected to be declared; a bare `@QA-n` is the app spec. */
const SPEC_FILES = {
  '': 'packages/apps/composer-app/spec/APP.mdl',
  'review': 'packages/plugins/plugin-review/PLUGIN.mdl',
  'table': 'packages/plugins/plugin-table/PLUGIN.mdl',
  'github': 'packages/plugins/plugin-github/PLUGIN.mdl',
  'inbox': 'packages/plugins/plugin-inbox/PLUGIN.mdl',
  'markdown': 'packages/plugins/plugin-markdown/PLUGIN.mdl',
};

/**
 * Every `test(...)` in a spec, with its describe trail and its tags.
 *
 * Brace-free and AST-free: `test.describe(` and `test(` both open a block whose title is the first
 * string literal, and the describe trail is tracked by indentation, which every spec in this
 * package follows. `test.skip(`/`test.describe.skip(` are matched too — a disabled test still has
 * to name the flow it will cover again, or disabling it is how coverage silently disappears.
 */
const readSpec = (file) => {
  const lines = readFileSync(path.join(SPEC_DIR, file), 'utf8')
    // oxfmt wraps a long `test(` call so the title lands on the next line; pulling the argument list
    // back up keeps this reader line-oriented without making it care where the formatter broke.
    .replace(/\btest(\.skip)?\(\s*\n\s*/g, 'test$1(')
    // …and again for the tag object, which a wrapped call puts on a line of its own.
    .replace(/,\s*\n\s*(\{\s*tag:)/g, ', $1')
    .split('\n');
  const tests = [];
  const trail = [];
  for (const line of lines) {
    // A blank line's indent reads as 0, which would close every open describe — and the tests of a
    // describe are routinely separated by one.
    if (line.trim() === '') {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    while (trail.length > 0 && indent <= trail[trail.length - 1].indent) {
      trail.pop();
    }
    // Skipping is INHERITED: `test.describe.skip` disables every test under it, and a flow that
    // counted those as coverage would read as automated while nothing ran — the exact rot this
    // check exists to catch. `tables.spec.ts` and `inbox.spec.ts` are both whole-suite skips.
    const inheritedSkip = trail.some((entry) => entry.skipped);
    const describe = /^\s*test\.describe(\.skip)?\(\s*(['"])(.*?)\2/.exec(line);
    if (describe) {
      trail.push({ indent, title: describe[3], skipped: describe[1] !== undefined || inheritedSkip });
      continue;
    }
    const test = /^\s*test(\.skip)?\(\s*(['"])(.*?)\2\s*,(.*)$/.exec(line);
    if (test) {
      const tags = [...test[4].matchAll(/'(@[^']+)'/g)].map((match) => match[1]);
      tests.push({
        file,
        title: [...trail.map((entry) => entry.title), test[3]].join(' › '),
        tags,
        // A disabled test still declares its flow, but must not be counted as covering it.
        skipped: test[1] !== undefined || inheritedSkip,
      });
    }
  }
  return tests;
};

/** Every `<package>:<file>#<title>` entry under an `automated:` key, with the flow it belongs to. */
const readAutomated = (relativePath) => {
  const lines = readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf8').split('\n');
  const entries = [];
  let flow;
  let inBlock = false;
  for (const line of lines) {
    const test = /^test\s+(QA-\d+)\s*:/.exec(line);
    if (test) {
      flow = test[1];
      inBlock = false;
      continue;
    }
    if (/^\s{2}automated:\s*$/.test(line)) {
      inBlock = true;
      continue;
    }
    if (inBlock) {
      const entry = /^\s{4}-\s*(.+?)\s*$/.exec(line);
      if (entry) {
        entries.push({ flow, entry: entry[1] });
        continue;
      }
      inBlock = false;
    }
  }
  return entries;
};

const main = () => {
  const specs = readdirSync(SPEC_DIR).filter((name) => name.endsWith('.spec.ts'));
  const tests = specs.flatMap(readSpec);
  const errors = [];

  // Tag -> flow reference, as an `automated:` entry would spell this test. Skipped tests are
  // deliberately absent: they must carry a tag, but they cover nothing while disabled.
  const claimed = new Map();
  for (const test of tests) {
    const qa = test.tags.filter((tag) => /^@(?:[a-z-]+:)?QA-\d+$/.test(tag));
    if (qa.length === 0) {
      errors.push(
        `${test.file}: "${test.title}" carries no @QA tag — every test is the automated arm of a flow, ` +
          `so add one (\`test('…', { tag: ['@QA-n'] }, …)\`) or write the flow first.`,
      );
      continue;
    }
    for (const tag of qa) {
      const [prefix, flow] = tag.slice(1).includes(':') ? tag.slice(1).split(':') : ['', tag.slice(1)];
      if (!(prefix in SPEC_FILES)) {
        errors.push(`${test.file}: "${test.title}" tags ${tag}, but no .mdl is registered for "${prefix}".`);
        continue;
      }
      if (test.skipped) {
        continue;
      }
      const key = `${prefix}|${flow}`;
      claimed.set(key, [...(claimed.get(key) ?? []), `${PACKAGE}:${test.file}#${test.title}`]);
    }
  }

  for (const [prefix, relativePath] of Object.entries(SPEC_FILES)) {
    const declared = readAutomated(relativePath).filter(({ entry }) => entry.startsWith(`${PACKAGE}:`));
    const byFlow = new Map();
    for (const { flow, entry } of declared) {
      byFlow.set(flow, [...(byFlow.get(flow) ?? []), entry]);
      const owner = tests.find(({ file, title }) => entry === `${PACKAGE}:${file}#${title}`);
      // The tag has to name THIS flow, not merely exist: a test retagged from `@QA-1` to `@QA-2`
      // would otherwise leave QA-1's stale entry matching on file and title alone, so QA-1 would go
      // on claiming a test that no longer declares it.
      const expected = `@${prefix ? `${prefix}:` : ''}${flow}`;
      if (!owner) {
        errors.push(`${relativePath}: ${flow} automates "${entry}", which no test in this package declares.`);
      } else if (!owner.tags.includes(expected)) {
        errors.push(`${relativePath}: ${flow} automates "${entry}", but that test does not declare ${expected}.`);
      } else if (owner.skipped) {
        // The rot this whole check exists for: the flow reads as automated while nothing runs it.
        errors.push(
          `${relativePath}: ${flow} automates "${entry}", which is \`test.skip\` — drop it from ` +
            '`automated:` until the test runs again, or the flow claims coverage it does not have.',
        );
      }
    }
    for (const [key, entries] of claimed) {
      const [tagPrefix, flow] = key.split('|');
      if (tagPrefix !== prefix) {
        continue;
      }
      const listed = byFlow.get(flow) ?? [];
      if (listed.length === 0) {
        errors.push(`${relativePath}: no \`test ${flow}\` with an \`automated:\` block, but specs tag it.`);
        continue;
      }
      for (const entry of entries) {
        if (!listed.includes(entry)) {
          errors.push(`${relativePath}: ${flow} does not list "${entry}", which tags it.`);
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`✗ ${error}`);
    }
    console.error(`\n${errors.length} QA coverage problem(s). See packages/e2e/composer-e2e/BEST-PRACTICES.md.`);
    process.exit(1);
  }

  console.log(`✓ ${tests.length} test(s) across ${specs.length} spec(s), each bound to an .mdl QA flow.`);
};

main();
