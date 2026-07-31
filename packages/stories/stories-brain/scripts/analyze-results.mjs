//
// Copyright 2026 DXOS.org
//

// Sanity-analyzes the research results so failed/empty/partial runs are surfaced rather than glossed.
// Reads fixtures/local/results/*.json (+ sibling .md) and progress.json, prints a status table, and
// exits non-zero if any test is EMPTY or ERROR. Run: node scripts/analyze-results.mjs
//
// This is a mechanical gate (did the test produce non-degenerate output?). Answer/summary QUALITY is
// a separate concern — see the LLM-judge task in TASKS.md.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = resolve(pkg, 'fixtures/local/results');
const feedPath = process.env.MAILBOX_FEED_FIXTURE ?? resolve(pkg, 'fixtures/local/mailbox-feed.json');
const feedCount = existsSync(feedPath) ? JSON.parse(readFileSync(feedPath, 'utf8')).length : undefined;

if (!existsSync(resultsDir)) {
  console.error(`no results dir: ${resultsDir}`);
  process.exit(1);
}

// Deep scan a JSON value for any `error` field (bench error rows, eval errors).
const errorsIn = (value) => {
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      for (const [key, val] of Object.entries(node)) {
        if (key === 'error' && val) {
          found.push(String(val).split('\n')[0].slice(0, 60));
        } else {
          walk(val);
        }
      }
    }
  };
  walk(value);
  return found;
};

// The primary "did it produce output" count for a result doc, best-effort across shapes.
const primaryCount = (doc) => {
  if (typeof doc.factCount === 'number') {
    return doc.factCount;
  }
  if (Array.isArray(doc.rows) && doc.rows.length) {
    // Fact rows carry `facts`/`processed`; graded rows (model-ladder, classify-sender) carry item
    // counts (`n`/`scored`) with accuracy instead — fall back to the row count so a graded run whose
    // rows have no fact tally isn't mis-flagged EMPTY.
    const summed = doc.rows.reduce((sum, r) => sum + (r.facts ?? r.processed ?? r.n ?? r.scored ?? 0), 0);
    return summed || doc.rows.length;
  }
  if (Array.isArray(doc.variants) && doc.variants.length) {
    const metrics = doc.variants.map((v) => v.metrics ?? {});
    const key = Object.keys(metrics[0] ?? {}).find((k) => k.endsWith('.out'));
    return key ? Math.max(...metrics.map((m) => m[key] ?? 0)) : undefined;
  }
  if (typeof doc.distinctContacts === 'number') {
    return doc.distinctContacts;
  }
  return undefined;
};

const mdBlocks = (jsonPath) => {
  const md = jsonPath.replace(/\.json$/, '.md');
  return existsSync(md) ? (readFileSync(md, 'utf8').match(/^## /gm) ?? []).length : undefined;
};

// Tests whose corpus is NOT the full message feed, so a count < feedCount is expected (not partial):
// html-vs-text is intentionally small; summarize-threads is counted in threads, not messages;
// model-ladder grades a capped set (LADDER_N); classify-sender counts unique senders, not messages.
const NON_FEED_TESTS = new Set([
  'html-vs-text',
  'summarize-threads',
  'html-to-markdown',
  'model-ladder',
  'classify-sender',
]);

const files = readdirSync(resultsDir).filter((f) => f.endsWith('.json') && f !== 'progress.json');
const rows = [];
let problems = 0;

for (const file of files) {
  const path = join(resultsDir, file);
  let doc;
  try {
    doc = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    rows.push({ name: file, status: 'ERROR', note: `unparseable: ${err.message}` });
    problems++;
    continue;
  }
  const messages = doc.messages ?? doc.corpusSize ?? doc.messagesWithBothParts;
  const count = primaryCount(doc);
  const md = mdBlocks(path);
  const errs = errorsIn(doc);

  const notes = [];
  let status = 'OK';
  if (errs.length) {
    status = 'ERROR';
    notes.push(`${errs.length} error(s): ${errs[0]}`);
  } else if (count === 0 || (md !== undefined && md === 0 && (messages ?? 0) > 0)) {
    status = 'EMPTY';
    notes.push('no output produced');
  } else if (
    feedCount !== undefined &&
    typeof messages === 'number' &&
    messages > 0 &&
    messages < feedCount &&
    !NON_FEED_TESTS.has(basename(file, '.json'))
  ) {
    status = 'PARTIAL';
    notes.push(`${messages}/${feedCount} messages (capped run?)`);
  }
  if (status !== 'OK') {
    problems++;
  }
  rows.push({ name: basename(file, '.json'), messages, count, md, status, note: notes.join('; ') });
}

// Cross-check the live progress snapshot.
const progressPath = join(resultsDir, 'progress.json');
if (existsSync(progressPath)) {
  try {
    const tasks = (JSON.parse(readFileSync(progressPath, 'utf8')).tasks ?? []).filter(
      (t) => t.status === 'error' || (t.status === 'running' && t.current < (t.total ?? Infinity)),
    );
    for (const task of tasks) {
      console.log(`progress: ${task.name} ${task.status} ${task.current}/${task.total ?? '?'}`);
    }
  } catch {
    console.error(`malformed progress file: ${progressPath}`);
  }
}

const pad = (value, width) => String(value ?? '').padEnd(width);
console.log('\n' + pad('test', 22) + pad('msgs', 6) + pad('count', 7) + pad('md', 5) + pad('status', 9) + 'note');
console.log('-'.repeat(90));
for (const row of rows.sort((a, b) => a.name.localeCompare(b.name))) {
  console.log(
    pad(row.name, 22) +
      pad(row.messages, 6) +
      pad(row.count, 7) +
      pad(row.md, 5) +
      pad(row.status, 9) +
      (row.note ?? ''),
  );
}
console.log(`\n${rows.length} results, ${problems} problem(s).`);
process.exit(problems > 0 ? 1 : 0);
