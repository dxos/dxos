//
// Copyright 2026 DXOS.org
//

// Orchestrates the research suite: seeds the full task manifest into progress.json (so pending tests
// show up front), runs each test file in dependency order, and marks coarse status (running/done/
// error) per test — while the per-message benches stream fine current/total into the same file via
// the pipeline Progress reporter. Merge-on-write keeps one shared snapshot.
//
// Usage (from packages/stories/stories-brain):
//   OLLAMA_ORIGINS="*" MODELS=qwen node scripts/run-suite.mjs
//   TESTS=tags,summarize-messages LIMIT=20 node scripts/run-suite.mjs   # subset

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROGRESS = resolve(pkg, 'fixtures/local/results/progress.json');
const FEED = process.env.MAILBOX_FEED_FIXTURE ?? resolve(pkg, 'fixtures/local/mailbox-feed.json');
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;
const feedCount = existsSync(FEED) ? JSON.parse(readFileSync(FEED, 'utf8')).length : undefined;
const messageTotal = feedCount === undefined ? undefined : LIMIT ? Math.min(LIMIT, feedCount) : feedCount;

// Dependency order: extract-facts writes the fact store the fact-based tests read.
const MANIFEST = [
  { name: 'extract-facts', file: 'src/test/extract-facts.bench.test.ts', total: messageTotal },
  { name: 'extract-contacts', file: 'src/test/extract-contacts.test.ts' },
  { name: 'feed-stats', file: 'src/test/feed-stats.test.ts' },
  { name: 'subject-facts', file: 'src/test/subject-facts.test.ts' },
  { name: 'tags', file: 'src/test/tags.bench.test.ts', total: messageTotal },
  { name: 'summarize-messages', file: 'src/test/summarize-messages.bench.test.ts', total: messageTotal },
  { name: 'summarize-threads', file: 'src/test/summarize-threads.bench.test.ts' },
  { name: 'extract-questions', file: 'src/test/extract-questions.bench.test.ts', total: messageTotal },
  { name: 'draft-responses', file: 'src/test/draft-responses.bench.test.ts', total: messageTotal },
  { name: 'html-vs-text', file: 'src/test/html-vs-text.bench.test.ts' },
  { name: 'html-to-markdown', file: 'src/test/html-to-markdown.bench.test.ts' },
  { name: 'brain-vs-rag-eval', file: 'src/test/brain-skill-eval.test.ts' },
];

const only = process.env.TESTS?.split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const suite = only?.length ? MANIFEST.filter((item) => only.includes(item.name)) : MANIFEST;

const now = () => new Date().toISOString();
const read = () => (existsSync(PROGRESS) ? JSON.parse(readFileSync(PROGRESS, 'utf8')) : { tasks: [] });
const write = (tasks) => {
  mkdirSync(dirname(PROGRESS), { recursive: true });
  writeFileSync(PROGRESS, JSON.stringify({ updatedAt: now(), tasks }, null, 2));
};
const merge = (name, patch) => {
  const byName = new Map(read().tasks.map((task) => [task.name, task]));
  byName.set(name, { name, current: 0, ...(byName.get(name) ?? {}), ...patch, updatedAt: now() });
  write([...byName.values()]);
};

// Seed the full manifest as pending so the snapshot shows every test from the start.
write(
  suite.map((item) => ({
    name: item.name,
    label: item.name,
    total: item.total,
    current: 0,
    status: 'pending',
    updatedAt: now(),
  })),
);

let failed = 0;
for (const item of suite) {
  merge(item.name, { status: 'running', startedAt: now() });
  console.log(`\n===== ${item.name} =====`);
  const result = spawnSync('pnpm', ['exec', 'vitest', 'run', item.file], {
    cwd: pkg,
    stdio: 'inherit',
    env: process.env,
  });
  const ok = result.status === 0;
  merge(item.name, { status: ok ? 'done' : 'error' });
  if (!ok) {
    failed++;
  }
}

console.log(`\nsuite complete: ${suite.length - failed}/${suite.length} ok — progress: ${PROGRESS}`);

// Sanity-analyze the results (flags empty/failed/partial outputs).
console.log('\n===== analyze-results =====');
const analyze = spawnSync('node', ['scripts/analyze-results.mjs'], { cwd: pkg, stdio: 'inherit', env: process.env });

process.exit(failed > 0 || analyze.status !== 0 ? 1 : 0);
