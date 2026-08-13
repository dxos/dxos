//
// Copyright 2026 DXOS.org
//

// Minimal reader for the `.mdl` document format (see packages/reflect/deus/lang/
// core.mdl): YAML frontmatter + markdown body + typed ```mdl fenced blocks. A
// `rule` block is one of the things an `.mdl` document may define; this module
// extracts those and ignores every other block type, so descriptor documents
// (SPEC.mdl / PLUGIN.mdl) simply yield no rules.
//
// The parser is intentionally lenient and dependency-free: a standalone script
// cannot resolve the deus package parser, and rule discovery must never choke on
// an unrelated `.mdl` file elsewhere in the repo.

import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const RULE_SUFFIX = '.mdl';

const VALID_SEVERITIES = new Set(['warn', 'error']);
const VALID_SCOPES = new Set(['dir', 'repo']);
const RULE_KEYS = new Set(['files', 'grep', 'severity', 'scope']);

/** Extract the raw line arrays of every ```mdl fenced block in a document. */
export const parseMdlBlocks = (text) => {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let buffer = null;
  for (const line of lines) {
    if (buffer === null) {
      if (/^\s*```mdl\s*$/.test(line)) {
        buffer = [];
      }
    } else if (/^\s*```\s*$/.test(line)) {
      blocks.push(buffer);
      buffer = null;
    } else {
      buffer.push(line);
    }
  }
  return blocks;
};

/** Parse a block's header line `<type> [<id>][: <title>]`. */
const parseHeader = (line) => {
  const [, beforeColon, titlePart] = line.match(/^([^:]*?)(?::\s*(.*))?$/);
  const tokens = beforeColon.trim().split(/\s+/);
  return { type: tokens[0] ?? '', id: tokens[1] ?? null, title: titlePart?.trim() || null };
};

/** Strip the common leading indentation from a set of body lines. */
const dedent = (lines) => {
  const indents = lines.filter((line) => line.trim() !== '').map((line) => line.match(/^\s*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(min));
};

/**
 * Parse a `rule` block body into fields + instructions. Recognized keys
 * (`files`, `grep`, `severity`, `scope`) are structured; every other non-empty
 * line is instruction prose.
 */
const parseRuleBody = (bodyLines) => {
  const lines = dedent(bodyLines);
  const fields = {};
  let files = [];
  const prose = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const keyMatch = line.match(/^([a-z]+)\s*:\s*(.*)$/);
    if (keyMatch && RULE_KEYS.has(keyMatch[1])) {
      const key = keyMatch[1];
      const value = keyMatch[2].trim();
      if (key === 'files') {
        if (value) {
          files = [value];
        } else {
          while (index + 1 < lines.length && /^\s*-\s+/.test(lines[index + 1])) {
            files.push(lines[index + 1].replace(/^\s*-\s+/, '').trim());
            index++;
          }
        }
      } else {
        fields[key] = value;
      }
    } else {
      prose.push(line);
    }
  }

  return {
    files,
    grep: fields.grep ?? null,
    severity: fields.severity,
    scope: fields.scope,
    instructions: prose.join('\n').trim(),
  };
};

/**
 * Load every `rule` block from an `.mdl` file into validated rule objects.
 *
 * @param {string} path Absolute path to the `.mdl` file.
 * @returns {Array<{ id, title, files: string[], grep: string|null,
 *   severity: 'warn'|'error', scope: 'dir'|'repo', dir: string, instructions: string, path: string }>}
 */
export const loadRules = (path) => {
  const text = readFileSync(path, 'utf8');
  const dir = dirname(path);
  const rules = [];

  for (const blockLines of parseMdlBlocks(text)) {
    const headerIndex = blockLines.findIndex((line) => line.trim() !== '');
    if (headerIndex === -1) {
      continue;
    }
    const header = parseHeader(blockLines[headerIndex].trim());
    if (header.type !== 'rule') {
      continue;
    }
    if (!header.id) {
      throw new Error(`${path}: a \`rule\` block is missing its id (\`rule <id>: <title>\`)`);
    }

    const { files, grep, severity, scope, instructions } = parseRuleBody(blockLines.slice(headerIndex + 1));
    const where = `${path} (rule \`${header.id}\`)`;
    if (files.length === 0) {
      throw new Error(`${where}: must declare at least one \`files\` glob`);
    }
    const resolvedSeverity = severity ?? 'warn';
    if (!VALID_SEVERITIES.has(resolvedSeverity)) {
      throw new Error(`${where}: invalid severity ${JSON.stringify(resolvedSeverity)} (expected warn|error)`);
    }
    const resolvedScope = scope ?? 'dir';
    if (!VALID_SCOPES.has(resolvedScope)) {
      throw new Error(`${where}: invalid scope ${JSON.stringify(resolvedScope)} (expected dir|repo)`);
    }
    if (instructions.length === 0) {
      throw new Error(`${where}: rule instructions (prose) are empty`);
    }

    rules.push({
      id: header.id,
      title: header.title ?? header.id,
      files,
      grep,
      severity: resolvedSeverity,
      scope: resolvedScope,
      dir,
      instructions,
      path,
    });
  }

  return rules;
};
