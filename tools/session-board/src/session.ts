//
// Copyright 2026 DXOS.org
//

import * as Yaml from 'yaml';

import { type MdlBlock, lintMdl, parseMdlBlocks } from '@dxos/deus/parse';

import {
  BOARD_FORMAT,
  type BoardData,
  type Goal,
  GOAL_STATUSES,
  type GoalStatus,
  PR_STATUSES,
  type PrStatus,
  type PullRequest,
  type Question,
  type TimelineEvent,
} from './types.ts';

/** Word budgets that keep the board terse (`lang/session.mdl` rule 1): goal and PR titles are lines, questions and events sentences. */
export const LIMITS = {
  titleWords: 12,
  questionWords: 25,
  eventWords: 25,
  noteWords: 25,
  notes: 6,
};

export type Problem = { line: number; message: string };

/** A line of board prose with the source line it came from, for the STE check that runs after parsing. */
export type Sentence = { line: number; text: string };

export type ParseResult = {
  board?: BoardData;
  errors: Problem[];
  sentences: Sentence[];
};

export type ParseOptions = {
  updated?: string;
  source?: string;
  /** Earlier versions of the file (the PR's base, the last commit); their timeline, questions and answers must survive. */
  previous?: readonly string[];
};

/** Each block type's id prefix: `Q-1`, `D-1`, `G-1`, `PR-1`, `T-1`, numbered in the order written. */
const ID_PREFIXES: Record<string, string> = { question: 'Q', decision: 'D', goal: 'G', pr: 'PR', event: 'T' };

const GITHUB_REF = /^([\w.-]+)\/([\w.-]+)#(\d+)$/;

/** ISO 8601 to the minute, UTC: `2026-11-21T11:55Z`, seconds allowed. */
// Milliseconds at most: `Date.parse` drops finer digits, which would let `.0001Z` follow `.0009Z`.
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

/** A list item with the body line it starts on, so a finding about one note points at that note. */
type Item = { text: string; offset: number };

type Fields = { scalars: Map<string, string>; lists: Map<string, Item[]>; prose: string[] };

/** A block body's `key: value` scalars, `key:` lists of `- item`, and the inline prose before the first key. */
const parseFields = (body: string): Fields => {
  const fields: Fields = { scalars: new Map(), lists: new Map(), prose: [] };
  let list: Item[] | undefined;
  body.split('\n').forEach((line, offset) => {
    const key = line.match(/^ {2}([A-Za-z][\w-]*):\s*(.*)$/);
    const item = line.match(/^ {4}- (.*)$/);
    if (key) {
      list = undefined;
      if (key[2]) {
        fields.scalars.set(key[1], key[2].trim());
      } else {
        list = [];
        fields.lists.set(key[1], list);
      }
    } else if (item && list) {
      list.push({ text: item[1].trim(), offset });
    } else if (list && /^ {6}\S/.test(line) && list.length > 0) {
      list[list.length - 1].text += ` ${line.trim()}`;
    } else if (/^ {2}\S/.test(line) && fields.scalars.size === 0 && fields.lists.size === 0) {
      fields.prose.push(line.trim());
    }
  });
  return fields;
};

/** `[Q-1, Q-2]` or `Q-1, Q-2` as ids. */
const refList = (value: string | undefined): string[] =>
  (value ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((ref) => ref.trim())
    .filter(Boolean);

const countWords = (text: string): number =>
  text
    .replace(/`[^`]*`/g, 'X')
    .split(/\s+/)
    .filter((word) => /\w/.test(word)).length;

/** The prose of a line with code and references taken out, which is all the STE check can judge. */
const proseOf = (text: string): string =>
  text
    .replace(/`[^`]*`/g, 'X')
    .replace(/\[[A-Z]+-\d+\]/g, 'X')
    .trim();

/** `name` and `id` from the YAML frontmatter, decoded as YAML so a quoted name reads as its value. */
const frontmatter = (text: string): { id?: string; name?: string } => {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
  const data: unknown = block === undefined ? undefined : Yaml.parse(block);
  if (typeof data !== 'object' || data === null) {
    return {};
  }
  const read = (key: string) => {
    const value: unknown = Reflect.get(data, key);
    return typeof value === 'string' && value ? value : undefined;
  };
  return { id: read('id'), name: read('name') };
};

/** The first paragraph after the `#` heading, outside any fence, joined across its wrapped lines. */
const summaryOf = (text: string): { text: string; line: number } | undefined => {
  const lines = text.split('\n');
  const heading = lines.findIndex((line) => /^# \S/.test(line));
  if (heading < 0) {
    return undefined;
  }
  const start = lines.findIndex((line, index) => index > heading && line.trim() !== '');
  if (start < 0 || /^(#|```|\|)/.test(lines[start].trim())) {
    return undefined;
  }
  const paragraph: string[] = [];
  // A heading, fence or table ends the paragraph even without a blank line before it.
  for (let index = start; index < lines.length && !/^(|#.*|```.*|\|.*)$/.test(lines[index].trim()); index++) {
    paragraph.push(lines[index].trim());
  }
  return { text: paragraph.join(' '), line: start + 1 };
};

const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length;

const blocksOf = (text: string): MdlBlock[] =>
  parseMdlBlocks(text).filter((block) => Object.hasOwn(ID_PREFIXES, block.type));

/** The section each block type belongs in (`lang/session.mdl`). */
const SECTIONS: Record<string, string> = {
  question: 'Changelog',
  goal: 'Goals',
  pr: 'Pull requests',
  decision: 'Changelog',
  event: 'Timeline',
};

/** The `##` heading in force at `offset`. */
const sectionAt = (text: string, offset: number): string | undefined =>
  [...text.slice(0, offset).matchAll(/^## (.+?)\s*$/gm)].at(-1)?.[1];

/**
 * The blocks an append-only rule protects, by type and in file order, each as its whole text; a committed list must
 * stay an unchanged prefix of the new one, so an edit, a removal, a reordering and an insertion all show.
 */
const protectedBlocks = (text: string): Map<string, string[]> => {
  const byType = new Map<string, string[]>();
  for (const block of blocksOf(text)) {
    if (block.type === 'event' || block.type === 'question' || block.type === 'decision') {
      byType.set(block.type, [
        ...(byType.get(block.type) ?? []),
        `${block.type} ${block.id}: ${block.title ?? ''}\n${block.body}`,
      ]);
    }
  }
  return byType;
};

/**
 * Parses a `SESSION.mdl` (`lang/session.mdl`): `question`, `decision`, `goal`, `pr` and `event` blocks. Errors carry
 * the source line; the board is returned only when there are none.
 */
export const parseSession = (text: string, options: ParseOptions = {}): ParseResult => {
  const errors: Problem[] = [];
  const sentences: Sentence[] = [];
  const error = (line: number, message: string) => errors.push({ line, message });

  for (const diagnostic of lintMdl(text)) {
    if (diagnostic.severity === 'error') {
      error(lineAt(text, diagnostic.from), diagnostic.message);
    }
  }

  const meta = frontmatter(text);
  if (!meta.id) {
    error(1, 'the frontmatter has no `id`');
  }
  if (!meta.name) {
    error(1, 'the frontmatter has no `name`; it is the page title');
  }
  const summary = summaryOf(text);
  if (summary) {
    if (countWords(summary.text) > LIMITS.noteWords) {
      error(summary.line, `the summary has more than ${LIMITS.noteWords} words`);
    }
    sentences.push({ line: summary.line, text: proseOf(summary.text) });
  }

  const questions: Question[] = [];
  /** Each question's active answer, and the decision that gave it, so only a decision superseding that one replaces it. */
  const answers = new Map<string, { decision: string; text: string }>();
  /** Each decision about a question, by id, so a later one can name it in `supersedes`. */
  const decisions = new Map<string, string>();
  const decisionIds = new Set<string>();
  const goals: Goal[] = [];
  const prs: PullRequest[] = [];
  const timeline: TimelineEvent[] = [];
  const seen = new Set<string>();

  for (const block of parseMdlBlocks(text)) {
    const line = lineAt(text, block.from) + 1;
    const prefix = ID_PREFIXES[block.type];
    if (!prefix) {
      continue;
    }
    if (!new RegExp(`^${prefix}-\\d+$`).test(block.id)) {
      error(line, `a \`${block.type}\` id looks like ${prefix}-1, not "${block.id}"`);
      continue;
    }
    if (seen.has(block.id)) {
      error(line, `${block.id} occurs two times`);
    }
    seen.add(block.id);
    const section = sectionAt(text, block.from);
    if (section !== SECTIONS[block.type]) {
      error(
        line,
        `${block.id} belongs under \`## ${SECTIONS[block.type]}\`${section ? `, not \`## ${section}\`` : ''}`,
      );
    }

    const fields = parseFields(block.body);
    const title = block.title?.trim() ?? fields.prose.join(' ');
    const checkTitle = (limit: number) => {
      if (!title) {
        error(line, `${block.id} has no title`);
      } else if (countWords(title) > limit) {
        error(line, `${block.id}: ${countWords(title)} words; the limit is ${limit}`);
      }
      sentences.push({ line, text: proseOf(title) });
    };
    const notes = (): string[] => {
      const items = fields.lists.get('notes') ?? [];
      if (items.length > LIMITS.notes) {
        error(line, `${block.id} has more than ${LIMITS.notes} notes`);
      }
      for (const note of items) {
        const noteLine = line + note.offset + 1;
        if (countWords(note.text) > LIMITS.noteWords) {
          error(noteLine, `${block.id}: a note has ${countWords(note.text)} words; the limit is ${LIMITS.noteWords}`);
        }
        sentences.push({ line: noteLine, text: proseOf(note.text) });
      }
      return items.map((note) => note.text);
    };

    switch (block.type) {
      case 'question': {
        checkTitle(LIMITS.questionWords);
        const options = (fields.lists.get('options') ?? []).map(({ text: option }) => {
          const [head, ...rest] = option.split(':');
          return rest.length > 0 ? { title: head.trim(), description: rest.join(':').trim() } : { title: option };
        });
        const context = fields.scalars.get('context');
        questions.push({ id: block.id, text: title, options, ...(context ? { context } : {}) });
        break;
      }
      case 'decision': {
        const answered = fields.scalars.get('answers');
        const superseded = fields.scalars.get('supersedes');
        const replaces = superseded ? decisions.get(superseded) : undefined;
        if (superseded && !decisionIds.has(superseded)) {
          error(line, `${block.id} supersedes ${superseded}, which is not an earlier decision`);
        }
        if (answered && replaces && answered !== replaces) {
          error(line, `${block.id} answers ${answered} but supersedes ${superseded}, which answered ${replaces}`);
        }
        decisionIds.add(block.id);
        const question = answered ?? replaces;
        if (question && !title) {
          error(line, `${block.id} answers ${question} but says nothing; write the answer as its title`);
          break;
        }
        // The first decision that answers a question counts, until one supersedes that very decision (`lang/changelog.mdl` rule 10).
        const active = question ? answers.get(question) : undefined;
        if (question && (!active || (superseded !== undefined && active.decision === superseded))) {
          answers.set(question, { decision: block.id, text: title });
        }
        if (question) {
          decisions.set(block.id, question);
        }
        break;
      }
      case 'goal': {
        checkTitle(LIMITS.titleWords);
        const status = fields.scalars.get('status');
        if (!GOAL_STATUSES.some((value) => value === status)) {
          error(line, `${block.id}: status must be one of ${GOAL_STATUSES.join(', ')}`);
        }
        goals.push({
          id: block.id,
          title,
          status: GOAL_STATUSES.find((value): value is GoalStatus => value === status) ?? 'todo',
          blockedBy: refList(fields.scalars.get('blockedBy')),
          blocked: false,
          notes: notes(),
        });
        break;
      }
      case 'pr': {
        checkTitle(LIMITS.titleWords);
        const ref = fields.scalars.get('ref') ?? '';
        const match = ref.match(GITHUB_REF);
        if (!match) {
          error(line, `${block.id}: ref must be owner/repo#number`);
        }
        // Optional: the build reads the state from GitHub, and only `landing` and `queued` need saying.
        const status = fields.scalars.get('status');
        if (status !== undefined && !PR_STATUSES.some((value) => value === status)) {
          error(line, `${block.id}: status must be one of ${PR_STATUSES.join(', ')}`);
        }
        const branch = fields.scalars.get('branch');
        prs.push({
          id: block.id,
          title,
          ref,
          url: match ? `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}` : '',
          status: PR_STATUSES.find((value): value is PrStatus => value === status) ?? 'open',
          ...(branch ? { branch } : {}),
          notes: notes(),
        });
        break;
      }
      case 'event': {
        checkTitle(LIMITS.eventWords);
        const date = fields.scalars.get('date') ?? '';
        // A string that only looks like a timestamp (month 13) parses to NaN and would break the page's date math.
        const time = DATE_TIME.test(date) ? Date.parse(date) : Number.NaN;
        if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 16) !== date.slice(0, 16)) {
          error(line, `${block.id}: date must be an ISO 8601 UTC time to the minute, like 2026-11-21T11:55Z`);
        }
        const previous = timeline[timeline.length - 1];
        if (previous && time < Date.parse(previous.date)) {
          error(line, `${block.id} is dated before ${previous.id}; the timeline only goes forward`);
        }
        if (previous && Number(block.id.slice(prefix.length + 1)) <= Number(previous.id.slice(prefix.length + 1))) {
          error(line, `${block.id} follows ${previous.id}; event ids only increase`);
        }
        const by = fields.scalars.get('by');
        timeline.push({ id: block.id, title, date, ...(by ? { by } : {}) });
        break;
      }
    }
  }

  const questionIds = new Set(questions.map((question) => question.id));
  for (const [id] of answers) {
    if (!questionIds.has(id)) {
      error(1, `a decision answers ${id}, which is not a question in this file`);
    }
  }
  for (const goal of goals) {
    for (const id of goal.blockedBy) {
      if (!questionIds.has(id)) {
        error(1, `${goal.id} is blocked by ${id}, which is not a question in this file`);
      }
    }
    goal.blocked = goal.blockedBy.some((id) => !answers.has(id));
  }
  for (const question of questions) {
    const answer = answers.get(question.id);
    if (answer) {
      question.answer = answer.text;
    }
  }

  const now = protectedBlocks(text);
  const reported = new Set<string>();
  for (const previous of options.previous ?? []) {
    for (const [type, before] of protectedBlocks(previous)) {
      const after = now.get(type) ?? [];
      const changed = before.findIndex((entry, index) => after[index] !== entry);
      if (changed >= 0) {
        const id = before[changed].slice(type.length + 1).split(':')[0];
        if (reported.has(`${type} ${id}`)) {
          continue;
        }
        reported.add(`${type} ${id}`);
        error(
          1,
          `${type} ${id} was edited, removed or moved; questions, answers and the timeline only grow at the end`,
        );
      }
    }
  }

  if (errors.length > 0 || !meta.name) {
    return { errors, sentences };
  }
  return {
    errors,
    sentences,
    board: {
      format: BOARD_FORMAT,
      title: meta.name,
      ...(summary ? { summary: summary.text } : {}),
      updated: options.updated ?? new Date().toISOString(),
      ...(options.source ? { source: options.source } : {}),
      questions,
      goals,
      prs,
      timeline,
    },
  };
};
