//
// Copyright 2026 DXOS.org
//

import { type Diagnostic } from '@codemirror/lint';

import { BLOCK_TYPES } from './constants.ts';

const KNOWN_BLOCK_TYPES = new Set(BLOCK_TYPES);

/**
 * Regex matching the opening fence of a Spec mdl block.
 * All Spec blocks use ```mdl; the block type lives on the first body line.
 */
export const FENCE_REGEX = /^```mdl\s*$/gm;

type BlockHeader = { type: string; id: string; from: number; to: number; body: string };

/** An unindented `<kind> <id>` line, which opens another block inside the same fence. */
const LATER_HEADER = /^[a-z]\w*\s+[^\s:]/;

/**
 * Extracts block headers from the raw document text.
 * Returns { type, id, from, to, body } for each block, reading the block type from its header line. A fence may hold
 * several blocks, each opened by an unindented header; the first spans the fence's opening line and each later one
 * spans its own header line, so diagnostics land on the block they are about.
 */
const parseBlockHeaders = (text: string): BlockHeader[] => {
  const results: BlockHeader[] = [];
  const fenceRe = new RegExp(FENCE_REGEX.source, FENCE_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text)) !== null) {
    const fenceStart = match.index;
    const fenceEnd = fenceStart + match[0].length;
    const bodyStart = text.indexOf('\n', fenceEnd);
    if (bodyStart === -1) {
      continue;
    }
    const firstBodyLineStart = bodyStart + 1;

    // An unclosed block (mid-edit) ends at the next fence of either kind, or at the end of the text.
    const endMatch = /^```/m.exec(text.slice(firstBodyLineStart));
    const fenceBody = endMatch
      ? text.slice(firstBodyLineStart, firstBodyLineStart + endMatch.index)
      : text.slice(firstBodyLineStart);

    const starts: number[] = [];
    let lineStart = 0;
    for (const line of fenceBody.split('\n')) {
      if (starts.length === 0 || LATER_HEADER.test(line)) {
        starts.push(lineStart);
      }
      lineStart += line.length + 1;
    }
    starts.forEach((start, index) => {
      const body = fenceBody.slice(start, starts[index + 1]);
      const newline = body.indexOf('\n');
      const header = (newline === -1 ? body : body.slice(0, newline)).trim();
      // Header line: "<blockType> [name][: label]"
      const lineMatch = header.match(/^(\w+)(?:\s+([^\s:][^\n:]*?))?(?::\s*[^\n]*)?\s*$/);
      const blockType = lineMatch?.[1] ?? '';
      const id = lineMatch?.[2]?.trim() ?? '';
      const from = index === 0 ? fenceStart : firstBodyLineStart + start;
      const to = index === 0 ? fenceEnd : from + (newline === -1 ? body.length : newline);
      results.push({ type: blockType, id, from, to, body });
    });
  }
  return results;
};

const USER_REF = /^user:\S+$/;
const AGENT_REF = /^agent:\S+$/;

const fieldValue = (body: string, field: string): string | undefined =>
  body.match(new RegExp(`^\\s+${field}:[ \\t]*(.*?)[ \\t]*(?:#.*)?$`, 'm'))?.[1];

/**
 * Checks the attribution rules of the changelog dialect (`lang/changelog.mdl`), which keep
 * decisions made by people and decisions made by agents separable.
 */
const lintDecision = (body: string): string[] => {
  const errors: string[] = [];
  const by = fieldValue(body, 'by');
  const principal = fieldValue(body, 'for');
  if (!by) {
    errors.push('Decision is missing `by:` — name the user: or agent: that made it.');
  } else if (AGENT_REF.test(by)) {
    if (!principal) {
      errors.push('Agent decision is missing `for:` — name the user: the agent acted for.');
    }
  } else if (USER_REF.test(by)) {
    if (principal !== undefined) {
      errors.push('`for:` applies only to agent decisions.');
    }
  } else {
    errors.push(`Decision \`by: ${by}\` must be \`user:<handle>\` or \`agent:<name>\`.`);
  }
  if (principal && !USER_REF.test(principal)) {
    errors.push(`\`for: ${principal}\` must be \`user:<handle>\`.`);
  }
  return errors;
};

/** One fenced `mdl` block: its type, identifier and title from the header line, and the body below it. */
export type MdlBlock = {
  type: string;
  /** Empty for a block with no identifier. */
  id: string;
  /** The prose after the header's colon, if any. */
  title?: string;
  /** The block's lines after the header. */
  body: string;
  /** Offset of the opening fence for a fence's first block, or of the header line for each later one. */
  from: number;
};

/** Every `mdl` block of a spec, in document order, including each later block of a fence that holds several. */
export const parseMdlBlocks = (text: string): MdlBlock[] =>
  parseBlockHeaders(text).map(({ type, id, from, body }) => {
    const newline = body.indexOf('\n');
    const header = newline === -1 ? body : body.slice(0, newline);
    const title = header.match(/^\s*\w+\s+[^\s:][^\n:]*?:\s*(.+?)\s*$/)?.[1];
    return { type, id, ...(title && { title }), body: newline === -1 ? '' : body.slice(newline + 1), from };
  });

/**
 * Lints the text of a Spec .mdl document.
 *
 * Checks:
 *   - Unknown block types (first body line of ```mdl blocks) → error
 *   - `decision` attribution (`by:` / `for:` actor prefixes) → error
 *   - (future) Missing required fields → error
 *   - (future) Unresolved cross-references → error
 */
export const lintMdl = (text: string): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  for (const { type, from, to, body } of parseBlockHeaders(text)) {
    if (type && !KNOWN_BLOCK_TYPES.has(type as (typeof BLOCK_TYPES)[number])) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        source: 'mdl/block-type',
        message: `Unknown block type "${type}". Declare it in the Extensions table or define it with an \`ext\` block.`,
      });
    } else if (type === 'decision') {
      for (const message of lintDecision(body)) {
        diagnostics.push({ from, to, severity: 'error', source: 'mdl/decision', message });
      }
    }
  }

  return diagnostics;
};

/** One `decision` block of a spec's `## Changelog`, with the fields of `lang/changelog.mdl` it carries. */
export type ChangelogEntry = {
  id: string;
  /** The whole block body, for comparing entries. */
  text: string;
  /** The decision itself: the inline prose after `decision D-n:`. */
  title: string;
  date?: string;
  /** The decider, `user:<handle>` or `agent:<name>`. */
  by?: string;
  /** The person an agent acted for. */
  for?: string;
  quote?: string;
  context?: string;
  why?: string;
  source?: string;
  supersedes?: string;
  /** Block ids the decision constrains. */
  affects: string[];
  /** Other decisions the prose cites as `[D-n]`, in order of first mention. */
  refs: string[];
  rejected: string[];
};

const CHANGELOG_HEADING = /^## Changelog[ \t]*$/m;
const DECISION_ID = /^D-(\d+)$/;
const DECISION_REF = /\[(D-\d+)\]/g;

const indentOf = (line: string): number => line.length - line.trimStart().length;

/** A field's value as lines: the inline value, or the indented lines of a `|` block or a `- item` list. */
const fieldLines = (body: string, field: string): string[] | undefined => {
  const lines = body.split('\n');
  const index = lines.findIndex((line) => new RegExp(`^\\s+${field}:`).test(line));
  if (index === -1) {
    return undefined;
  }
  const inline = fieldValue(lines[index], field);
  if (inline && inline !== '|' && inline !== '>') {
    return [inline];
  }
  const indent = indentOf(lines[index]);
  const end = lines.findIndex((line, next) => next > index && line.trim() !== '' && indentOf(line) <= indent);
  return lines.slice(index + 1, end === -1 ? undefined : end).map((line) => line.trim());
};

const fieldText = (body: string, field: string): string | undefined => fieldLines(body, field)?.join('\n').trim();

const parseList = (value: string | undefined): string[] =>
  value
    ?.replace(/^\[|\]$/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? [];

const parseDecision = ({ id, body }: BlockHeader): ChangelogEntry => {
  const title = body
    .split('\n')[0]
    .replace(/^\w+\s+[^:]*:\s*/, '')
    .trim();
  const supersedes = fieldValue(body, 'supersedes');
  const why = fieldText(body, 'why');
  const context = fieldText(body, 'context');
  const refs = [title, why, context]
    .flatMap((prose) => [...(prose ?? '').matchAll(DECISION_REF)].map((match) => match[1]))
    .filter((ref, index, all) => ref !== id && all.indexOf(ref) === index);
  return {
    id,
    text: body.trim(),
    title,
    date: fieldValue(body, 'date'),
    by: fieldValue(body, 'by'),
    for: fieldValue(body, 'for'),
    quote: fieldText(body, 'quote'),
    context,
    why,
    source: fieldValue(body, 'source'),
    supersedes,
    affects: parseList(fieldValue(body, 'affects')),
    refs,
    rejected: (fieldLines(body, 'rejected') ?? []).filter(Boolean).map((line) => line.replace(/^-\s*/, '')),
  };
};

/**
 * Splits a spec into its `## Changelog` entries and everything else.
 * The section runs from its heading to the next level-1 or level-2 heading.
 */
export const parseChangelog = (text: string): { entries: ChangelogEntry[]; rest: string } => {
  const heading = CHANGELOG_HEADING.exec(text);
  if (!heading) {
    return { entries: [], rest: text };
  }
  const sectionStart = heading.index;
  const afterHeading = sectionStart + heading[0].length;
  const next = /^#{1,2} /m.exec(text.slice(afterHeading));
  const sectionEnd = next ? afterHeading + next.index : text.length;
  const section = text.slice(sectionStart, sectionEnd);
  const entries = parseBlockHeaders(section)
    .filter(({ type }) => type === 'decision')
    .map(parseDecision);
  return { entries, rest: text.slice(0, sectionStart) + text.slice(sectionEnd) };
};

const normalize = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();

/** Reported when a spec changed beyond a trivial edit with no new decision; the one error a waiver lifts. */
export const MISSING_DECISION = 'The spec changed but no decision was added to `## Changelog`.';

const TYPO_MAX_WORDS = 3;

// One letter in these flips what a requirement says (must/most, can/can't), so they are never a typo fix.
const NORMATIVE_WORDS = new Set([
  'all',
  'always',
  'any',
  'can',
  'cannot',
  'every',
  'may',
  'must',
  'never',
  'no',
  'none',
  'not',
  'only',
  'shall',
  'should',
]);

/** Optimal string alignment distance: insertions, deletions, substitutions and adjacent swaps each cost one. */
const editDistance = (left: string, right: string): number => {
  const rows = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (_, col) => (row === 0 ? col : col === 0 ? row : 0)),
  );
  for (let row = 1; row <= left.length; row++) {
    for (let col = 1; col <= right.length; col++) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      rows[row][col] = Math.min(rows[row - 1][col] + 1, rows[row][col - 1] + 1, rows[row - 1][col - 1] + cost);
      if (row > 1 && col > 1 && left[row - 1] === right[col - 2] && left[row - 2] === right[col - 1]) {
        rows[row][col] = Math.min(rows[row][col], rows[row - 2][col - 2] + 1);
      }
    }
  }
  return rows[left.length][right.length];
};

const bareWord = (word: string): string => word.toLowerCase().replace(/[^a-z']/g, '');

const isTypoFix = (prev: string, next: string): boolean =>
  !/\d/.test(prev + next) &&
  !NORMATIVE_WORDS.has(bareWord(prev)) &&
  !NORMATIVE_WORDS.has(bareWord(next)) &&
  editDistance(prev, next) <= Math.floor(Math.max(prev.length, next.length) / 3);

/**
 * True when `after` differs from `before` only by whitespace or a few small typo fixes, which do not change what
 * the spec requires. Words with digits are ids or numbers, where one character is a different meaning.
 */
export const isTrivialEdit = (before: string, after: string): boolean => {
  const prevWords = before.split(/\s+/).filter(Boolean);
  const nextWords = after.split(/\s+/).filter(Boolean);
  if (prevWords.length !== nextWords.length) {
    return false;
  }
  const changed = prevWords
    .map((word, index) => [word, nextWords[index]] as const)
    .filter(([prev, next]) => prev !== next);
  return changed.length <= TYPO_MAX_WORDS && changed.every(([prev, next]) => isTypoFix(prev, next));
};

/**
 * Checks one spec change against the changelog rules: every change except a trivial edit adds a decision, and the
 * log is append-only with monotonic ids. `before` is undefined for a new spec.
 */
export const checkChangelogChange = (before: string | undefined, after: string): string[] => {
  const errors: string[] = [];
  const prev = before === undefined ? { entries: [], rest: '' } : parseChangelog(before);
  const next = parseChangelog(after);

  const ids = next.entries.map(({ id }) => id);
  for (const id of ids) {
    if (!DECISION_ID.test(id)) {
      errors.push(`Decision id \`${id}\` must be \`D-<n>\`.`);
    }
  }
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicates)) {
    errors.push(`Decision ${id} appears more than once.`);
  }

  const nextById = new Map(next.entries.map((entry) => [entry.id, entry]));
  for (const { id, text } of prev.entries) {
    const current = nextById.get(id);
    if (!current) {
      errors.push(`Decision ${id} was removed — the changelog is append-only; supersede it instead.`);
    } else if (normalize(current.text) !== normalize(text)) {
      errors.push(`Decision ${id} was edited — the changelog is append-only; supersede it instead.`);
    }
  }

  const prevIds = new Set(prev.entries.map(({ id }) => id));
  const added = next.entries.filter(({ id }) => !prevIds.has(id));
  const kept = ids.filter((id) => prevIds.has(id));
  const firstAdded = ids.findIndex((id) => !prevIds.has(id));
  const keptInOrder =
    kept.join() ===
    prev.entries
      .filter(({ id }) => nextById.has(id))
      .map(({ id }) => id)
      .join();
  if (!keptInOrder || (firstAdded !== -1 && ids.slice(firstAdded).some((id) => prevIds.has(id)))) {
    errors.push('Decisions must stay in order, with new ones appended last.');
  }

  let expected = Math.max(0, ...prev.entries.map(({ id }) => Number(DECISION_ID.exec(id)?.[1] ?? 0))) + 1;
  for (const { id } of added) {
    if (id !== `D-${expected}`) {
      errors.push(`Decision ${id} is out of sequence — the next id is D-${expected}.`);
    }
    expected++;
  }

  for (const { id, supersedes } of next.entries) {
    if (supersedes !== undefined && !nextById.has(supersedes)) {
      errors.push(`Decision ${id} supersedes ${supersedes}, which is not in the changelog.`);
    }
  }

  if (added.length === 0 && (before === undefined || !isTrivialEdit(prev.rest, next.rest))) {
    errors.push(
      before === undefined ? 'A new spec needs a `## Changelog` with at least one decision.' : MISSING_DECISION,
    );
  }

  return errors;
};
