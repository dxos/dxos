#!/usr/bin/env node
// Verifies that path references inside .agents/skills/**/*.md resolve to real files,
// so skill docs fail fast instead of rotting silently (see .agents/skills/README.md).
//
// Checked references:
//   - markdown links with a relative target: [text](../effect/SKILL.md)
//   - inline-code tokens that name a repo path: `packages/foo/bar.ts`, `tools/x/run.sh`
//     (resolved from the repo root, falling back to the doc's own directory)
//
// Skipped: URLs, globs/placeholders (*, ?, <, >, {, }), bare filenames without a
// directory, package-relative examples (src/…, ./…) that have no single root, fenced
// code blocks, generated files (app.log etc.), and files carrying an ignore marker:
//
//   <!-- skill-refs: ignore -->   (historical records and vendored upstream docs)
//
// Usage: node scripts/check-skill-refs.mjs [--root <dir>]

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';

const repoRoot = resolve(process.argv.includes('--root') ? process.argv[process.argv.indexOf('--root') + 1] : '.');
const skillsRoot = join(repoRoot, '.agents/skills');

// Repo-relative prefixes we can resolve unambiguously from the repo root.
const ROOT_PREFIXES = /^(packages|tools|scripts|docs|agents|\.agents|\.claude|\.github|\.moon|\.config)\//;
// Anything with glob or placeholder syntax is an example, not a reference.
const NON_LITERAL = /[*?<>{}|\\\s…]|\.\.\./;
// Files that exist only at runtime.
const GENERATED = /(^|\/)(app|test|test-browser)\.log$/;
const IGNORE_MARKER = 'skill-refs: ignore';
// A line deliberately naming a path that no longer exists opts out with this marker.
const IGNORE_LINE_MARKER = 'skill-refs: ignore-line';

const mdFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (entry.endsWith('.md')) mdFiles.push(full);
  }
};
walk(skillsRoot);

/** Strip #anchor, trailing /, and :line[,line…][:col] suffixes. */
const stripSuffix = (path) =>
  path
    .replace(/#.*$/, '')
    .replace(/:[\d,:]+$/, '')
    .replace(/\/$/, '');

const failures = [];
const check = (file, lineNo, raw, target, { relativeOk }) => {
  const cleaned = stripSuffix(target);
  if (!cleaned || NON_LITERAL.test(cleaned) || GENERATED.test(cleaned)) return;
  const candidates = [];
  if (relativeOk && (cleaned.startsWith('./') || cleaned.startsWith('../'))) {
    candidates.push(resolve(dirname(file), cleaned));
  } else if (ROOT_PREFIXES.test(cleaned)) {
    // Prefer the repo root; fall back to the doc's own directory (skills that ship
    // their own scripts/ refer to it without a leading ./).
    candidates.push(join(repoRoot, cleaned), resolve(dirname(file), cleaned));
  } else {
    return; // Bare names and package-relative examples are unresolvable — skip.
  }
  if (!candidates.some((candidate) => existsSync(candidate))) {
    failures.push({ file, lineNo, raw });
  }
};

let checkedFiles = 0;
for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8');
  if (text.includes(IGNORE_MARKER)) continue;
  checkedFiles++;
  let inFence = false;
  text.split('\n').forEach((line, idx) => {
    // Fenced blocks hold command examples with fake paths — skip them entirely.
    if (/^\s*(```|````)/.test(line)) inFence = !inFence;
    if (inFence || line.includes(IGNORE_LINE_MARKER)) return;
    const lineNo = idx + 1;
    for (const match of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|#)/.test(target) || isAbsolute(target)) continue;
      check(file, lineNo, match[0], target, { relativeOk: true });
    }
    // Inline-code tokens, with markdown links removed so link text is not re-checked.
    const withoutLinks = line.replace(/\[[^\]]*\]\([^)]+\)/g, '');
    for (const match of withoutLinks.matchAll(/`([^`\n]+)`/g)) {
      const token = match[1];
      if (!token.includes('/') || token.startsWith('@') || /^(https?:|~)/.test(token)) continue;
      check(file, lineNo, match[0], token, { relativeOk: false });
    }
  });
}

if (failures.length) {
  console.error(`Dead path references in skill docs (${failures.length}):\n`);
  for (const { file, lineNo, raw } of failures) {
    console.error(`  ${file.replace(`${repoRoot}/`, '')}:${lineNo}  ${raw}`);
  }
  process.exit(1);
}
console.log(`OK — checked ${checkedFiles} skill docs, all path references resolve.`);
