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

/**
 * Extracts block headers from the raw document text.
 * Returns { type, id, from, to, body } for each fenced block opening,
 * reading the block type from the first line of the block body.
 */
const parseBlockHeaders = (text: string): BlockHeader[] => {
  const results: BlockHeader[] = [];
  const fenceRe = new RegExp(FENCE_REGEX.source, FENCE_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text)) !== null) {
    const fenceEnd = match.index + match[0].length;
    const bodyStart = text.indexOf('\n', fenceEnd);
    if (bodyStart === -1) {
      continue;
    }
    const firstBodyLineStart = bodyStart + 1;
    const firstBodyLineEnd = text.indexOf('\n', firstBodyLineStart);
    const firstBodyLine = (
      firstBodyLineEnd === -1 ? text.slice(firstBodyLineStart) : text.slice(firstBodyLineStart, firstBodyLineEnd)
    ).trim();

    // An unclosed block (mid-edit) ends at the next fence of either kind, or at the end of the text.
    const endMatch = /^```/m.exec(text.slice(firstBodyLineStart));
    const body = endMatch
      ? text.slice(firstBodyLineStart, firstBodyLineStart + endMatch.index)
      : text.slice(firstBodyLineStart);

    // First body line: "<blockType> [name][: label]"
    const lineMatch = firstBodyLine.match(/^(\w+)(?:\s+([^\s:][^\n:]*?))?(?::\s*[^\n]*)?\s*$/);
    const blockType = lineMatch?.[1] ?? '';
    const id = lineMatch?.[2]?.trim() ?? '';
    results.push({ type: blockType, id, from: match.index, to: match.index + match[0].length, body });
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

type ChangelogEntry = { id: string; text: string; supersedes?: string };

const CHANGELOG_HEADING = /^## Changelog[ \t]*$/m;
const DECISION_ID = /^D-(\d+)$/;

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
    .map(({ id, body }) => ({ id, text: body.trim(), supersedes: fieldValue(body, 'supersedes') }));
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
