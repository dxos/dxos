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
const VALID_SYSTEM_ONE = new Set(['on', 'off']);
const RULE_KEYS = new Set(['files', 'grep', 'severity', 'scope', 'unit', 'context', 'question', 'system-one']);
const LIST_KEYS = new Set(['files', 'context']);

/**
 * What one verdict is about: `file` judges each matched file on its own, `pr` judges the whole
 * change set once (a rule about what a change leaves behind cannot be seen one file at a time).
 */
export const UNITS = ['file', 'pr'];

/**
 * Material a checker adds beside the unit under review, by kind. Only the kinds a rule declares
 * are fetched, because a System One model loses accuracy on state full of unrelated detail.
 */
export const CONTEXT_KINDS = {
  'diff': "the file's changes against the review base",
  'imports': 'export signatures of the in-repo modules the file imports',
  'importers': 'the files that import this module, cut to the lines that use it',
  'siblings': 'the other files in the same directory with their exported names',
  'package': 'the owning package: name, workspace dependencies and layer',
  'public-api': "the owning package's entry barrel and exports map",
  'similar': 'exports elsewhere in the repo whose names overlap the ones this file exports',
  'test': 'the colocated test for a source file, or the module under test for a test file',
  'pr': 'commit messages and the changed-file list of the reviewed range',
};

/** Kinds that describe one file, which a `pr`-unit rule has no single file to attach to. */
const FILE_ONLY_KINDS = new Set(['imports', 'importers', 'siblings', 'test', 'similar']);

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
 * (`files`, `grep`, `severity`, `scope`, `unit`, `context`, `question`,
 * `system-one`) are structured; every other non-empty line is instruction prose.
 */
const parseRuleBody = (bodyLines) => {
  const lines = dedent(bodyLines);
  const fields = {};
  const lists = { files: [], context: [] };
  const prose = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const keyMatch = line.match(/^([a-z][a-z-]*)\s*:\s*(.*)$/);
    if (keyMatch && RULE_KEYS.has(keyMatch[1])) {
      const key = keyMatch[1];
      const value = keyMatch[2].trim();
      if (LIST_KEYS.has(key)) {
        const items = [];
        if (value) {
          // `files` keeps a single inline glob whole (a glob may contain a comma); `context` is a list.
          items.push(...(key === 'files' ? [value] : value.split(',').map((item) => item.trim())));
        } else {
          while (index + 1 < lines.length && /^\s*-\s+/.test(lines[index + 1])) {
            items.push(lines[index + 1].replace(/^\s*-\s+/, '').trim());
            index++;
          }
        }
        lists[key] = items.filter(Boolean);
      } else {
        fields[key] = value;
      }
    } else {
      prose.push(line);
    }
  }

  return {
    files: lists.files,
    context: lists.context,
    grep: fields.grep ?? null,
    severity: fields.severity,
    scope: fields.scope,
    unit: fields.unit,
    question: fields.question ?? null,
    systemOne: fields['system-one'],
    instructions: prose.join('\n').trim(),
  };
};

/**
 * Load every `rule` block from an `.mdl` file into validated rule objects.
 *
 * @param {string} path Absolute path to the `.mdl` file.
 * @returns {Array<{ id, title, files: string[], grep: string|null,
 *   severity: 'warn'|'error', scope: 'dir'|'repo', unit: 'file'|'pr', context: string[],
 *   question: string|null, systemOne: boolean, dir: string, instructions: string, path: string }>}
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

    const { files, context, grep, severity, scope, unit, question, systemOne, instructions } = parseRuleBody(
      blockLines.slice(headerIndex + 1),
    );
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
    const resolvedUnit = unit ?? 'file';
    if (!UNITS.includes(resolvedUnit)) {
      throw new Error(`${where}: invalid unit ${JSON.stringify(resolvedUnit)} (expected ${UNITS.join('|')})`);
    }
    for (const kind of context) {
      if (!(kind in CONTEXT_KINDS)) {
        throw new Error(
          `${where}: unknown context ${JSON.stringify(kind)} (expected one of ${Object.keys(CONTEXT_KINDS).join(', ')})`,
        );
      }
      if (resolvedUnit === 'pr' && FILE_ONLY_KINDS.has(kind)) {
        throw new Error(`${where}: context ${JSON.stringify(kind)} describes one file, but the rule's unit is \`pr\``);
      }
    }
    const resolvedSystemOne = systemOne ?? 'on';
    if (!VALID_SYSTEM_ONE.has(resolvedSystemOne)) {
      throw new Error(`${where}: invalid system-one ${JSON.stringify(resolvedSystemOne)} (expected on|off)`);
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
      unit: resolvedUnit,
      context: [...new Set(context)],
      question,
      systemOne: resolvedSystemOne === 'on',
      dir,
      instructions,
      path,
    });
  }

  return rules;
};
