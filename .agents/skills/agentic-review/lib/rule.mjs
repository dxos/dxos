//
// Copyright 2026 DXOS.org
//

// Loader and validator for `.rule.md` review-rule files: YAML frontmatter +
// markdown body (the instructions). A dedicated extension avoids colliding with
// the repo's existing `.mdl` module descriptors (SPEC.mdl / PLUGIN.mdl).

import { readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';

import { parseFrontmatter } from './frontmatter.mjs';

export const RULE_SUFFIX = '.rule.md';

const VALID_SEVERITIES = new Set(['warn', 'error']);
const VALID_SCOPES = new Set(['dir', 'repo']);

/**
 * Load and validate a single `.rule.md` file.
 *
 * @param {string} path Absolute path to the rule file.
 * @returns {{ id: string, title: string, files: string[], grep: string|null,
 *   severity: 'warn'|'error', scope: 'dir'|'repo', dir: string, instructions: string, path: string }}
 */
export const loadRule = (path) => {
  const text = readFileSync(path, 'utf8');
  let parsed;
  try {
    parsed = parseFrontmatter(text);
  } catch (err) {
    throw new Error(`${path}: ${err.message}`);
  }
  const { data, body } = parsed;

  const id = data.name ?? basename(path).replace(/\.rule\.md$/, '');
  const files = data.files == null ? [] : Array.isArray(data.files) ? data.files : [data.files];
  if (files.length === 0) {
    throw new Error(`${path}: rule must declare at least one \`files\` glob`);
  }

  const severity = data.severity ?? 'warn';
  if (!VALID_SEVERITIES.has(severity)) {
    throw new Error(`${path}: invalid severity ${JSON.stringify(severity)} (expected warn|error)`);
  }

  const scope = data.scope ?? 'dir';
  if (!VALID_SCOPES.has(scope)) {
    throw new Error(`${path}: invalid scope ${JSON.stringify(scope)} (expected dir|repo)`);
  }

  const instructions = body.trim();
  if (instructions.length === 0) {
    throw new Error(`${path}: rule body (instructions) is empty`);
  }

  return {
    id,
    title: data.title ?? id,
    files,
    grep: data.grep ?? null,
    severity,
    scope,
    dir: dirname(path),
    instructions,
    path,
  };
};
