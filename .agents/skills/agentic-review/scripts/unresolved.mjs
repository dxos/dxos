#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Re-print unresolved review issues across every finalized run under
// `.agents/reviews/`. Agents flip statuses in each run's RESOLUTION.md.
//
// Usage:
//   node unresolved.mjs [--path=<substr|glob>] [--rule=<rule-id>]
//
// `--path` matches if the issue file contains the substring (case-sensitive), or
// — when the value includes `*`/`?` — if it matches as a glob against the file
// path. `--rule` is an exact rule id match.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import { parseDiagnostics, renderDiagnostic } from '../lib/diagnostics.mjs';
import { repoRoot } from '../lib/git.mjs';
import { parseResolution, RESOLUTION_FILE } from '../lib/resolution.mjs';
import { REVIEWS_DIR, readReview } from '../lib/store.mjs';

const { values } = parseArgs({
  options: {
    path: { type: 'string' },
    rule: { type: 'string' },
  },
});

const root = repoRoot();
const reviewsPath = join(root, REVIEWS_DIR);
if (!existsSync(reviewsPath)) {
  console.log('(no reviews directory)');
  process.exit(0);
}

/** Convert a minimal glob (`*`, `**`, `?`) to a anchored RegExp. */
const globToRegExp = (pattern) => {
  let source = '';
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === '*' && pattern[index + 1] === '*') {
      source += '.*';
      index++;
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else if (/[.+^${}()|[\]\\]/.test(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }
  return new RegExp(`^${source}$`);
};

/** True when `file` satisfies the optional `--path` filter. */
const pathMatches = (file, filter) => {
  if (!filter) {
    return true;
  }
  if (/[*?]/.test(filter)) {
    const regex = globToRegExp(filter);
    return regex.test(file) || globToRegExp(`**/${filter}`).test(file);
  }
  return file.includes(filter);
};

const issues = [];
for (const entry of readdirSync(reviewsPath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) {
    continue;
  }
  const dir = join(reviewsPath, entry.name);
  const review = readReview(join(dir, 'REVIEW.md'));
  if (!review || String(review.data.isFinalized) !== 'true') {
    continue;
  }

  const resolutionPath = join(dir, RESOLUTION_FILE);
  if (!existsSync(resolutionPath)) {
    // Legacy finalized runs predate issue ids / RESOLUTION.md — skip rather than
    // invent statuses the agent cannot update.
    continue;
  }

  let statuses;
  try {
    statuses = parseResolution(readFileSync(resolutionPath, 'utf8'));
  } catch (error) {
    console.error(`${entry.name}/${RESOLUTION_FILE}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  let diagnostics;
  try {
    diagnostics = parseDiagnostics(review.body, `${entry.name}/REVIEW.md`);
  } catch (error) {
    console.error(`${entry.name}/REVIEW.md: ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  for (const diagnostic of diagnostics) {
    if (diagnostic.id == null) {
      continue;
    }
    const status = statuses.get(diagnostic.id) ?? 'unresolved';
    if (status !== 'unresolved') {
      continue;
    }
    if (values.rule && diagnostic.ruleId !== values.rule) {
      continue;
    }
    if (!pathMatches(diagnostic.file, values.path)) {
      continue;
    }
    issues.push({ slug: entry.name, diagnostic });
  }
}

if (issues.length === 0) {
  console.log('(no unresolved issues)');
  process.exit(0);
}

console.log(`${issues.length} unresolved issue(s)\n`);
for (const { slug, diagnostic } of issues) {
  console.log(`<!-- ${slug} -->`);
  console.log(renderDiagnostic(diagnostic));
  console.log('');
}
