//
// Copyright 2026 DXOS.org
//

import { type Diagnostic } from '@codemirror/lint';

import { frontmatter, reqIds } from '../spec-index/parse.ts';
import { type SpecIndex } from '../spec-index/spec-index.ts';
import {
  type BlockHeader,
  extensionTerms,
  findInnerBlockHeaders,
  parseBlockHeaders,
  parseMdlBlocks,
} from './blocks.ts';
import { BLOCK_TYPES } from './constants.ts';
import { findSpecKeys, findSpecRefs, specDependencies } from './refs.ts';

const KNOWN_BLOCK_TYPES = new Set(BLOCK_TYPES);

const USER_REF = /^user:\S+$/;
const AGENT_REF = /^agent:\S+$/;

const fieldValue = (body: string, field: string): string | undefined =>
  body.match(new RegExp(`^\\s+${field}:[ \\t]*(.*?)[ \\t]*(?:#.*)?$`, 'm'))?.[1];

/**
 * Checks the attribution rules of the changelog dialect (`lang/changelog.mdl`), which keep
 * decisions made by people and decisions made by agents separable. A `question` is attributed the same way.
 */
const lintAttribution = (body: string, noun: 'Decision' | 'Question'): string[] => {
  const errors: string[] = [];
  const by = fieldValue(body, 'by');
  const principal = fieldValue(body, 'for');
  if (!by) {
    errors.push(`${noun} is missing \`by:\` — name the user: or agent: that made it.`);
  } else if (AGENT_REF.test(by)) {
    if (!principal) {
      errors.push(`Agent ${noun.toLowerCase()} is missing \`for:\` — name the user: the agent acted for.`);
    }
  } else if (USER_REF.test(by)) {
    if (principal !== undefined) {
      errors.push(`\`for:\` applies only to agent ${noun.toLowerCase()}s.`);
    }
  } else {
    errors.push(`${noun} \`by: ${by}\` must be \`user:<handle>\` or \`agent:<name>\`.`);
  }
  if (principal && !USER_REF.test(principal)) {
    errors.push(`\`for: ${principal}\` must be \`user:<handle>\`.`);
  }
  return errors;
};

export type LintOptions = {
  /** Enables `mdl/ref` and `mdl/uses`, which need every other spec to resolve against. */
  index?: SpecIndex;
  /** The spec's own id; defaults to the frontmatter `id`. */
  selfId?: string;
};

const namespace = (id: string): string => id.split('.').slice(0, 2).join('.');

/** Lint message for an id the index does not hold. */
export const unknownSpecMessage = (id: string): string => `Unknown spec \`${id}\`.`;

/** Lint message for a reference to an item the spec does not declare. */
export const missingItemMessage = (id: string, item: string): string => `\`${id}\` has no item \`${item}\`.`;

/** Lint message for an id more than one file claims. */
export const duplicateSpecMessage = (id: string): string => `Spec id \`${id}\` is declared by more than one file.`;

/**
 * Whether a `<id>#<item>` candidate is a spec reference rather than prose (a file name, an external schema id):
 * its id is indexed, or shares its first two dotted segments with an indexed id.
 */
export const specReferenceFilter = (index: SpecIndex): ((id: string) => boolean) => {
  const namespaces = new Set([...Object.keys(index.specs), ...Object.keys(index.duplicates)].map(namespace));
  return (id) => namespaces.has(namespace(id));
};

const lintReferences = (text: string, index: SpecIndex, selfId: string | undefined): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const report = (source: string, from: number, to: number, message: string) =>
    diagnostics.push({ from, to, severity: 'error', source, message });
  const dependencies = specDependencies(text);
  const dependsOn = new Set(dependencies.filter(({ via }) => via === 'dependsOn').map(({ id }) => id));
  const declared = new Set<string>();

  if (selfId && selfId in index.duplicates) {
    const idLine = /^id:.*$/m.exec(text);
    report(
      'mdl/uses',
      idLine?.index ?? 0,
      (idLine?.index ?? 0) + (idLine?.[0].length ?? 0),
      duplicateSpecMessage(selfId),
    );
  }

  for (const { id, via, from, to } of dependencies) {
    if (id === selfId) {
      report('mdl/uses', from, to, 'A spec cannot use itself.');
    } else if (id in index.duplicates) {
      report('mdl/uses', from, to, duplicateSpecMessage(id));
    } else if (!(id in index.specs)) {
      report('mdl/uses', from, to, unknownSpecMessage(id));
    } else if (via === 'uses' && dependsOn.has(id)) {
      report('mdl/uses', from, to, `\`${id}\` is in dependsOn; do not repeat it under uses.`);
    } else if (declared.has(id)) {
      report('mdl/uses', from, to, `\`${id}\` is declared twice.`);
    }
    declared.add(id);
  }

  const isReference = specReferenceFilter(index);
  const dependencyIds = new Set(dependencies.map(({ id }) => id));
  // The spec's own items come from its text, since the index may predate the edit being linted.
  let ownItems: Set<string> | undefined;
  for (const { id, item, from, to } of findSpecRefs(text)) {
    if (id === selfId) {
      ownItems ??= new Set(
        parseMdlBlocks(text).flatMap(({ id: own, body }) => [...(own ? [own] : []), ...reqIds(body)]),
      );
      if (!ownItems.has(item)) {
        report('mdl/ref', from, to, missingItemMessage(id, item));
      }
      continue;
    }
    if (!isReference(id)) {
      continue;
    }
    if (id in index.duplicates) {
      report('mdl/ref', from, to, duplicateSpecMessage(id));
    } else if (!(id in index.specs)) {
      report('mdl/ref', from, to, unknownSpecMessage(id));
    } else if (!dependencyIds.has(id)) {
      report('mdl/ref', from, to, `\`${id}\` is not a dependency; add \`uses ${id}: …\` under ## Dependencies.`);
    } else if (!index.specs[id].items.includes(item)) {
      report('mdl/ref', from, to, missingItemMessage(id, item));
    }
  }

  // The changelog is append-only, so a decision that predates this rule keeps the key it was written with.
  const changelog = changelogRange(text);
  for (const { from, to } of findSpecKeys(text)) {
    if (!changelog || from < changelog.from || from >= changelog.to) {
      report('mdl/ref', from, to, 'Refer to a spec by id (`<id>#<item>`), not by a github: key.');
    }
  }
  return diagnostics;
};

/**
 * Lints the text of a Spec .mdl document.
 *
 * Checks:
 *   - Unknown block types (first body line of ```mdl blocks) → error
 *   - `decision` and `question` attribution (`by:` / `for:` actor prefixes) → error
 *   - `mdl/block`: a second block header inside one fence, which every tool reads as body → error
 *   - `mdl/ref` and `mdl/uses`: spec references and dependencies, when an index is given → error
 */
export const lintMdl = (text: string, { index, selfId = frontmatter(text).id }: LintOptions = {}): Diagnostic[] => {
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
    } else if (type === 'decision' || type === 'question') {
      for (const message of lintAttribution(body, type === 'decision' ? 'Decision' : 'Question')) {
        diagnostics.push({ from, to, severity: 'error', source: 'mdl/decision', message });
      }
    }
  }
  const types = new Set<string>([...BLOCK_TYPES, ...extensionTerms(text)]);
  for (const { type, id, from, to } of findInnerBlockHeaders(text, types)) {
    diagnostics.push({
      from,
      to,
      severity: 'error',
      source: 'mdl/block',
      message: `A second block header (\`${[type, id].filter(Boolean).join(' ')}\`) inside one fence; give each block its own \`\`\`mdl fence.`,
    });
  }
  if (index) {
    diagnostics.push(...lintReferences(text, index, selfId));
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
  /** The question this decision answers. */
  answers?: string;
  /** Block ids the decision constrains. */
  affects: string[];
  /** Other decisions the prose cites as `[D-n]`, in order of first mention. */
  refs: string[];
  rejected: string[];
};

/** One suggested answer of a `question`. */
export type QuestionOption = { title: string; description?: string };

/** One `question` block of a spec's `## Changelog`: a choice nobody has made yet (`lang/changelog.mdl` rule 10). */
export type ChangelogQuestion = {
  id: string;
  /** The whole block body, for comparing entries. */
  text: string;
  /** The question itself: the inline prose after `question Q-n:`. */
  title: string;
  date?: string;
  /** The asker, `user:<handle>` or `agent:<name>`. */
  by?: string;
  /** The person an agent asked for. */
  for?: string;
  context?: string;
  source?: string;
  /** Block ids the answer will constrain. */
  affects: string[];
  options: QuestionOption[];
};

const CHANGELOG_HEADING = /^## Changelog[ \t]*$/m;

/** The offsets of the `## Changelog` section, up to the next `## ` heading. */
const changelogRange = (text: string): { from: number; to: number } | undefined => {
  const heading = CHANGELOG_HEADING.exec(text);
  if (!heading) {
    return undefined;
  }
  const after = heading.index + heading[0].length;
  const next = text.slice(after).search(/^## /m);
  return { from: heading.index, to: next === -1 ? text.length : after + next };
};
const DECISION_ID = /^D-(\d+)$/;
const QUESTION_ID = /^Q-(\d+)$/;
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

const inlineProse = (body: string): string =>
  body
    .split('\n')[0]
    .replace(/^\w+\s+[^:]*:\s*/, '')
    .trim();

const parseDecision = ({ id, body }: BlockHeader): ChangelogEntry => {
  const title = inlineProse(body);
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
    answers: fieldValue(body, 'answers'),
    affects: parseList(fieldValue(body, 'affects')),
    refs,
    rejected: (fieldLines(body, 'rejected') ?? []).filter(Boolean).map((line) => line.replace(/^-\s*/, '')),
  };
};

/** An option line is `<title>: <description>`, or just a title. */
const parseOption = (line: string): QuestionOption => {
  const separator = line.indexOf(': ');
  return separator === -1
    ? { title: line.trim() }
    : { title: line.slice(0, separator).trim(), description: line.slice(separator + 2).trim() };
};

const parseQuestion = ({ id, body }: BlockHeader): ChangelogQuestion => ({
  id,
  text: body.trim(),
  title: inlineProse(body),
  date: fieldValue(body, 'date'),
  by: fieldValue(body, 'by'),
  for: fieldValue(body, 'for'),
  context: fieldText(body, 'context'),
  source: fieldValue(body, 'source'),
  affects: parseList(fieldValue(body, 'affects')),
  options: (fieldLines(body, 'options') ?? [])
    .filter((line) => line.startsWith('-'))
    .map((line) => parseOption(line.replace(/^-\s*/, ''))),
});

/**
 * Splits a spec into its `## Changelog` decisions, its questions, and everything else.
 * The section runs from its heading to the next level-1 or level-2 heading.
 */
export const parseChangelog = (
  text: string,
): { entries: ChangelogEntry[]; questions: ChangelogQuestion[]; rest: string } => {
  const heading = CHANGELOG_HEADING.exec(text);
  if (!heading) {
    return { entries: [], questions: [], rest: text };
  }
  const sectionStart = heading.index;
  const afterHeading = sectionStart + heading[0].length;
  const next = /^#{1,2} /m.exec(text.slice(afterHeading));
  const sectionEnd = next ? afterHeading + next.index : text.length;
  const section = text.slice(sectionStart, sectionEnd);
  const blocks = parseBlockHeaders(section);
  const entries = blocks.filter(({ type }) => type === 'decision').map(parseDecision);
  const questions = blocks.filter(({ type }) => type === 'question').map(parseQuestion);
  return { entries, questions, rest: text.slice(0, sectionStart) + text.slice(sectionEnd) };
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

/** Questions follow the decisions' append-only rules, with ids of their own sequence. */
const checkQuestions = (prev: readonly ChangelogQuestion[], next: readonly ChangelogQuestion[]): string[] => {
  const errors: string[] = [];
  const ids = next.map(({ id }) => id);
  for (const id of ids) {
    if (!QUESTION_ID.test(id)) {
      errors.push(`Question id \`${id}\` must be \`Q-<n>\`.`);
    }
  }
  for (const id of new Set(ids.filter((id, index) => ids.indexOf(id) !== index))) {
    errors.push(`Question ${id} appears more than once.`);
  }

  const nextById = new Map(next.map((question) => [question.id, question]));
  for (const { id, text } of prev) {
    const current = nextById.get(id);
    if (!current) {
      errors.push(`Question ${id} was removed — the changelog is append-only; answer it with a decision instead.`);
    } else if (normalize(current.text) !== normalize(text)) {
      errors.push(`Question ${id} was edited — the changelog is append-only; ask a new question instead.`);
    }
  }

  const prevIds = new Set(prev.map(({ id }) => id));
  let expected = Math.max(0, ...prev.map(({ id }) => Number(QUESTION_ID.exec(id)?.[1] ?? 0))) + 1;
  for (const { id } of next.filter(({ id }) => !prevIds.has(id))) {
    if (id !== `Q-${expected}`) {
      errors.push(`Question ${id} is out of sequence — the next id is Q-${expected}.`);
    }
    expected++;
  }
  return errors;
};

/**
 * Checks one spec change against the changelog rules: every change except a trivial edit adds a decision, and the
 * log is append-only with monotonic ids. `before` is undefined for a new spec.
 */
export const checkChangelogChange = (before: string | undefined, after: string): string[] => {
  const errors: string[] = [];
  const prev = before === undefined ? { entries: [], questions: [], rest: '' } : parseChangelog(before);
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

  errors.push(...checkQuestions(prev.questions, next.questions));
  const questionIds = new Set(next.questions.map(({ id }) => id));
  const answeredBy = new Map<string, string>();
  for (const { id, answers, supersedes } of next.entries) {
    if (answers === undefined) {
      continue;
    }
    const first = answeredBy.get(answers);
    if (!questionIds.has(answers)) {
      errors.push(`Decision ${id} answers ${answers}, which is not in the changelog.`);
    } else if (first !== undefined && supersedes !== first) {
      errors.push(`Decision ${id} answers ${answers}, which ${first} already answered — supersede ${first} instead.`);
    } else {
      answeredBy.set(answers, id);
    }
  }

  if (added.length === 0 && (before === undefined || !isTrivialEdit(prev.rest, next.rest))) {
    errors.push(
      before === undefined ? 'A new spec needs a `## Changelog` with at least one decision.' : MISSING_DECISION,
    );
  }

  return errors;
};
