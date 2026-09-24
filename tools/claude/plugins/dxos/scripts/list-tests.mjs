#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//
// Enumerates the executable `test QA-n` blocks and the `suite` blocks that group them across the
// repo's `.mdl` specs (the Deus.QA dialect, `packages/reflect/deus/lang/qa.mdl`).
//
// Usage: node list-tests.mjs [<plugin> <testId> | <filter>] [--tag <tag>] [--suite <name>] [--suites] [--json]
//   <plugin> <testId>  exactly one test — `markdown QA-1`, or `app QA-1` for composer-app's APP.mdl
//   <filter>           substring matched against the document path or the test id/title
//   --tag <tag>        the tests of every suite carrying that tag
//   --suite <name>     the tests of one suite, in the suite's order
//   --suites           list suites instead of tests
//
// Deliberately regex-based rather than a real parser: the block grammar is still settling, and a
// listing that breaks on an unparsed field is worse than one that reports what it found.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SKIP = new Set(['node_modules', 'dist', '.git', '.moon', 'out', 'temp', '.cache']);
const STAGES = ['before', 'steps', 'after'];

const walk = (dir, out = []) => {
  // Sorted: the row numbers are the addressing scheme, and readdir order is filesystem-defined.
  for (const entry of readdirSync(dir).sort()) {
    if (SKIP.has(entry)) {
      continue;
    }
    const path = join(dir, entry);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue; // Broken symlink.
    }
    if (stat.isDirectory()) {
      walk(path, out);
    } else if (entry.endsWith('.mdl')) {
      out.push(path);
    }
  }
  return out;
};

/** Steps per stage. A stage header sits at two spaces; its steps are `- name:`/`- do:` at four. */
const countStages = (body) => {
  const counts = Object.fromEntries(STAGES.map((stage) => [stage, 0]));
  let stage;
  for (const line of body.split('\n')) {
    const header = line.match(/^ {2}(\w+):\s*$/);
    if (header) {
      stage = header[1] in counts ? header[1] : undefined;
      continue;
    }
    if (stage && /^ {4}- +(?:name|do):/.test(line)) {
      counts[stage]++;
    }
  }
  return counts;
};

/** The short name a test or suite is addressed by: `markdown` for plugin-markdown, `app` for APP.mdl. */
const shortName = (file) =>
  file.match(/plugin-([\w-]+)\//)?.[1] ?? (file.endsWith('APP.mdl') ? 'app' : file.replace(/\.mdl$/, ''));

const parseList = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** Blocks of one kind in a document. Several blocks may share one fence, so headers are matched per line. */
const parseBlocks = (text, file, kind) => {
  const blocks = [];
  const fenceRe = /```mdl\n([\s\S]*?)```/g;
  let fence;
  while ((fence = fenceRe.exec(text)) !== null) {
    const headerRe = new RegExp(`^${kind}\\s+([\\w.-]+)\\s*(?::\\s*(.*))?$`, 'gm');
    const headers = [...fence[1].matchAll(headerRe)];
    headers.forEach((header, index) => {
      const body = fence[1].slice(header.index, headers[index + 1]?.index ?? fence[1].length);
      blocks.push({ file, plugin: shortName(file), id: header[1], title: (header[2] ?? '').trim(), body });
    });
  }
  return blocks;
};

const parseTests = (text, file) =>
  parseBlocks(text, file, 'test').map(({ body, ...block }) => ({
    ...block,
    status: body.match(/^\s*status:\s*(\w+)/m)?.[1] ?? 'unverified',
    actors: body.match(/^\s*actors:\s*([\w|\s]+?)\s*$/m)?.[1]?.trim() ?? 'both',
    // Per stage, so a partial run's size is visible; `steps` is the test, the other two are fixture.
    stages: countStages(body),
    covers: body.match(/^\s*covers:\s*\[(.*?)\]/m)?.[1] ?? '',
    tags: parseList(body.match(/^\s*tags:\s*\[(.*?)\]/m)?.[1]),
  }));

const parseSuites = (text, file) =>
  parseBlocks(text, file, 'suite').map(({ body, ...block }) => ({
    ...block,
    tags: parseList(body.match(/^\s*tags:\s*\[(.*?)\]/m)?.[1]),
    // A bare `QA-1` is this document's test; `markdown:QA-1` names another plugin's.
    tests: parseList(body.match(/^\s*tests:\s*\[(.*?)\]/m)?.[1]).map((ref) => {
      const [plugin, id] = ref.includes(':') ? ref.split(':') : [block.plugin, ref];
      return { plugin, id };
    }),
  }));

const root = process.env.DX_REPO_ROOT ?? process.cwd();
const args = process.argv.slice(2);
const flag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const asJson = args.includes('--json');
const listSuites = args.includes('--suites');
const tag = flag('--tag');
const suiteName = flag('--suite');
const positional = args.filter(
  (arg, index) => !arg.startsWith('--') && args[index - 1] !== '--tag' && args[index - 1] !== '--suite',
);

// Two positionals resolve exactly — `<plugin> <testId>`. One is the loose substring filter, and a
// test id alone is genuinely ambiguous: QA-1 exists in more than one plugin.
const [plugin, testId] = positional.length >= 2 ? positional : [undefined, undefined];
const filter = positional.length >= 2 ? undefined : positional[0];

// A dialect definition (`org.dxos.spec.*`) carries example tests to document its own syntax; those
// are illustrations, not plans, and listing them as runnable is a trap.
const isDialect = (text) => /^id:\s*org\.dxos\.spec\./m.test(text.split('---')[1] ?? '');

const documents = walk(root)
  .map((file) => ({ file: relative(root, file), text: readFileSync(file, 'utf8') }))
  .filter(({ text }) => !isDialect(text));
const tests = documents.flatMap(({ file, text }) => parseTests(text, file));
const suites = documents.flatMap(({ file, text }) => parseSuites(text, file));

const matchesPlugin = (item) => !plugin || item.plugin === plugin.replace(/^plugin-/, '');
const matchesFilter = (item) =>
  !filter || `${item.file} ${item.id} ${item.title}`.toLowerCase().includes(filter.toLowerCase());

/** The tests a suite names, in its order; a ref that resolves to nothing is reported, not dropped. */
const resolveSuite = (suite) =>
  suite.tests.map((ref) => {
    const test = tests.find((candidate) => candidate.plugin === ref.plugin && candidate.id === ref.id);
    return (
      test ?? { plugin: ref.plugin, id: ref.id, title: '(unresolved)', status: 'missing', file: suite.file, stages: {} }
    );
  });

let selectedSuites = suites.filter(matchesPlugin).filter(matchesFilter);
if (tag) {
  selectedSuites = suites.filter((suite) => suite.tags.includes(tag));
}
if (suiteName) {
  selectedSuites = suites.filter((suite) => suite.id === suiteName);
}

let rows;
if (listSuites) {
  rows = selectedSuites;
} else if (tag || suiteName) {
  // Suites are order-independent by construction (each test owns its fixture), so a tag's union is
  // simply every member test, de-duplicated, in suite order.
  const seen = new Set();
  rows = selectedSuites.flatMap(resolveSuite).filter((test) => {
    const key = `${test.plugin}:${test.id}`;
    return seen.has(key) ? false : seen.add(key);
  });
} else {
  rows = tests
    .filter(matchesPlugin)
    .filter(matchesFilter)
    .filter((test) => !testId || test.id.toLowerCase() === testId.toLowerCase());
}

if (asJson) {
  console.log(JSON.stringify(rows, null, 2));
} else if (rows.length === 0) {
  const what = plugin ? `${plugin} ${testId}` : (filter ?? tag ?? suiteName);
  console.log(
    what ? `No ${listSuites ? 'suites' : 'tests'} matching "${what}".` : `No ${listSuites ? 'suites' : 'tests'} found.`,
  );
} else if (listSuites) {
  const width = Math.max(...rows.map((suite) => suite.id.length));
  rows.forEach((suite, index) => {
    const num = String(index + 1).padStart(2);
    console.log(`${num}. ${suite.id.padEnd(width)}  ${String(suite.tests.length).padStart(2)} tests  ${suite.title}`);
    console.log(`    ${suite.file}${suite.tags.length ? `  tags: ${suite.tags.join(', ')}` : ''}`);
  });
} else {
  const width = (key) => Math.max(...rows.map((test) => String(test[key]).length));
  const [idWidth, statusWidth] = [width('id'), width('status')];
  rows.forEach((test, index) => {
    const num = String(index + 1).padStart(2);
    const { before = 0, steps = 0, after = 0 } = test.stages ?? {};
    console.log(
      `${num}. ${test.plugin}:${test.id.padEnd(idWidth)}  ${test.status.padEnd(statusWidth)}  ${String(steps).padStart(2)} steps` +
        ` (${before} before, ${after} after)  ${test.title}`,
    );
    console.log(`    ${test.file}${test.covers ? `  covers: ${test.covers}` : ''}`);
  });
}
