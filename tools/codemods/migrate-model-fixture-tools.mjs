//
// Copyright 2026 DXOS.org
//

// Rewrites the `parameters.tools[].inputSchema` of recorded model fixtures from Effect 3's JSON
// Schema emission to Effect 4's. The request a test replays is keyed on its parameters, so a changed
// emission is a key miss rather than a decode failure — every model-fixture suite goes red.
//
// The replacements are not hand-written: they are captured from a failing replay. `LanguageModelFixture`
// compares the prompted conversation against the closest stored one, and with `DX_DUMP_FIXTURE_TOOLS`
// set it writes both tool lists to that directory. Each pair is then applied wherever a stored schema
// matches exactly, so a rewrite can only ever land on the shape it was observed replacing.
//
// Usage:
//   1. DX_DUMP_FIXTURE_TOOLS=<dump-dir> VITEST_TAGS_FILTER=model-fixture DX_RUN_MODEL_FIXTURE_TESTS=1 \
//        moon run <project>:test -- --no-file-parallelism
//   2. node tools/codemods/migrate-model-fixture-tools.mjs <dump-dir> [store-dir]
//   3. Re-run (1) until no suite misses; a multi-turn fixture can reveal a tool the first pass never
//      reached.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dumpDir = process.argv[2];
const root = process.argv[3] ?? '.store/conversations';

if (!dumpDir) {
  throw new Error('Usage: migrate-model-fixture-tools.mjs <dump-dir> [store-dir]');
}

const jsonFiles = function* (dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* jsonFiles(path);
    } else if (entry.name.endsWith('.json')) {
      yield path;
    }
  }
};

// Stable key for a schema: `JSON.stringify` with sorted keys, so two structurally equal schemas that
// were serialized in different property orders still match.
const canonical = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(canonical).join(',')}]`;
  }
  if (value != null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

// `<tool name>\n<canonical stored schema>` → the v4 schema observed replacing it.
const replacements = new Map();
for (const file of jsonFiles(dumpDir)) {
  const { stored = [], prompted = [] } = JSON.parse(readFileSync(file, 'utf8'));
  const promptedByName = new Map(prompted.map((tool) => [tool.name, tool]));
  for (const tool of stored) {
    const replacement = promptedByName.get(tool.name);
    if (!replacement || canonical(tool.inputSchema) === canonical(replacement.inputSchema)) {
      continue;
    }
    replacements.set(`${tool.name}\n${canonical(tool.inputSchema)}`, replacement.inputSchema);
  }
}

let rewritten = 0;
let changedFiles = 0;
let scanned = 0;
const unmatched = new Set();

for (const file of jsonFiles(root)) {
  scanned++;
  const document = JSON.parse(readFileSync(file, 'utf8'));
  let changed = false;

  for (const tool of document.parameters?.tools ?? []) {
    const replacement = replacements.get(`${tool.name}\n${canonical(tool.inputSchema)}`);
    if (replacement) {
      tool.inputSchema = replacement;
      changed = true;
      rewritten++;
    } else {
      unmatched.add(tool.name);
    }
  }

  if (changed) {
    // The store encodes through `Schema.fromJsonString`, i.e. compact with no trailing newline.
    writeFileSync(file, JSON.stringify(document));
    changedFiles++;
  }
}

// eslint-disable-next-line no-console
console.log(
  `captured ${replacements.size} replacements; rewrote ${rewritten} tool schemas across ${changedFiles} fixtures (${scanned} scanned)`,
);
if (unmatched.size > 0) {
  // Either already migrated or never observed — the next replay says which.
  // eslint-disable-next-line no-console
  console.log(`left untouched: ${[...unmatched].sort().join(', ')}`);
}
