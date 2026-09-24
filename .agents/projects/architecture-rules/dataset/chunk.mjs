#!/usr/bin/env node
// Mechanically filters `comments.jsonl` down to comments worth classifying:
// drops self-replies, trivial acknowledgements, and comments on generated or
// vendored files. Adds `pr_title` / `pr_author` from `prs.jsonl`, writes the
// result to `chunks/NN.jsonl` (at most 40 comments per file, in `created_at`
// order), and writes a `summary.md` with dataset-level counts.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const commentsPath = join(scriptDirectory, 'comments.jsonl');
const prsPath = join(scriptDirectory, 'prs.jsonl');
const chunksDirectory = join(scriptDirectory, 'chunks');
const summaryPath = join(scriptDirectory, 'summary.md');

const maxCommentsPerChunk = 40;
const minBodyLength = 20;

const trivialBodyPattern = /^(lgtm|\+1|done|thanks|nit: typo|typo)\b/i;

const lockfileNames = new Set(['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']);

const isLockfilePath = (path) => lockfileNames.has(path.split('/').pop());
const isChangesetPath = (path) => /^\.changeset\/.*\.md$/.test(path);
const isGeneratedPath = (path) => path.endsWith('.d.ts') || path.includes('/dist/') || path.startsWith('dist/');

const readJsonl = (path) =>
  readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));

const comments = readJsonl(commentsPath);
const prs = readJsonl(prsPath);
const prsByNumber = new Map(prs.map((pr) => [pr.number, pr]));

const droppedCounts = {
  selfReply: 0,
  tooShort: 0,
  trivial: 0,
  lockfile: 0,
  changeset: 0,
  generated: 0,
};

const keptComments = [];

for (const comment of comments) {
  const pr = prsByNumber.get(comment.pr);
  const trimmedBody = comment.body.trim();

  if (pr && comment.author === pr.author) {
    droppedCounts.selfReply += 1;
    continue;
  }
  if (trimmedBody.length < minBodyLength) {
    droppedCounts.tooShort += 1;
    continue;
  }
  if (trivialBodyPattern.test(trimmedBody)) {
    droppedCounts.trivial += 1;
    continue;
  }
  if (isLockfilePath(comment.path)) {
    droppedCounts.lockfile += 1;
    continue;
  }
  if (isChangesetPath(comment.path)) {
    droppedCounts.changeset += 1;
    continue;
  }
  if (isGeneratedPath(comment.path)) {
    droppedCounts.generated += 1;
    continue;
  }

  keptComments.push({
    ...comment,
    pr_title: pr?.title ?? null,
    pr_author: pr?.author ?? null,
  });
}

keptComments.sort((a, b) => a.created_at.localeCompare(b.created_at));

mkdirSync(chunksDirectory, { recursive: true });
for (const existingFile of readdirSync(chunksDirectory)) {
  if (/^\d+\.jsonl$/.test(existingFile)) {
    unlinkSync(join(chunksDirectory, existingFile));
  }
}

const chunkCount = Math.ceil(keptComments.length / maxCommentsPerChunk) || 0;
for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
  const start = chunkIndex * maxCommentsPerChunk;
  const chunkComments = keptComments.slice(start, start + maxCommentsPerChunk);
  const chunkFileName = `${String(chunkIndex).padStart(2, '0')}.jsonl`;
  const content = chunkComments.map((comment) => JSON.stringify(comment)).join('\n') + '\n';
  writeFileSync(join(chunksDirectory, chunkFileName), content, 'utf8');
}

const countsByAuthor = new Map();
const countsByMonth = new Map();
const countsByDirectory = new Map();

for (const comment of keptComments) {
  countsByAuthor.set(comment.author, (countsByAuthor.get(comment.author) ?? 0) + 1);

  const month = comment.created_at.slice(0, 7);
  countsByMonth.set(month, (countsByMonth.get(month) ?? 0) + 1);

  const segments = comment.path.split('/');
  const directory = segments[0] === 'packages' && segments.length > 1 ? segments[1] : `(non-packages) ${segments[0]}`;
  countsByDirectory.set(directory, (countsByDirectory.get(directory) ?? 0) + 1);
}

const sortEntriesByCountDesc = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]);

const renderTable = (headerLeft, headerRight, entries) => {
  const lines = [`| ${headerLeft} | ${headerRight} |`, '| --- | --- |'];
  for (const [key, count] of entries) {
    lines.push(`| ${key} | ${count} |`);
  }
  return lines.join('\n');
};

const summaryLines = [
  '# Review comment dataset summary',
  '',
  `- Total comments scraped: ${comments.length}`,
  `- Total comments kept (after mechanical filtering): ${keptComments.length}`,
  `- Chunk count: ${chunkCount} (\`chunks/00.jsonl\` .. \`chunks/${String(Math.max(chunkCount - 1, 0)).padStart(2, '0')}.jsonl\`, ≤ ${maxCommentsPerChunk} comments each)`,
  '',
  '## Dropped, by reason',
  '',
  renderTable('Reason', 'Count', Object.entries(droppedCounts)),
  '',
  '## Kept comments per author',
  '',
  renderTable('Author', 'Count', sortEntriesByCountDesc(countsByAuthor)),
  '',
  '## Kept comments per month',
  '',
  renderTable(
    'Month',
    'Count',
    [...countsByMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  ),
  '',
  '## Kept comments per top-level directory under `packages/`',
  '',
  renderTable('Directory', 'Count', sortEntriesByCountDesc(countsByDirectory)),
  '',
];

writeFileSync(summaryPath, summaryLines.join('\n'), 'utf8');

console.error(`Kept ${keptComments.length} of ${comments.length} comments across ${chunkCount} chunks.`);
console.error(`Wrote ${summaryPath}`);
