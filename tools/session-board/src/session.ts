//
// Copyright 2026 DXOS.org
//

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

/** Word budgets that keep the board terse (`lang/session.mdl` rule 1). */
export const LIMITS = {
  titleWords: 12,
  questionWords: 25,
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
  /** The committed version of the file; its timeline, questions and answers must survive unchanged. */
  previous?: string;
};

/** Each block type's id prefix: `Q-1`, `D-1`, `G-1`, `PR-1`, `T-1`, numbered in the order written. */
const ID_PREFIXES: Record<string, string> = { question: 'Q', decision: 'D', goal: 'G', pr: 'PR', event: 'T' };

const GITHUB_REF = /^([\w.-]+)\/([\w.-]+)#(\d+)$/;

/** ISO 8601 to the minute, UTC: `2026-11-21T11:55Z`, seconds allowed. */
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;

type Fields = { scalars: Map<string, string>; lists: Map<string, string[]>; prose: string[] };

/** A block body's `key: value` scalars, `key:` lists of `- item`, and the inline prose before the first key. */
const parseFields = (body: string): Fields => {
  const fields: Fields = { scalars: new Map(), lists: new Map(), prose: [] };
  let list: string[] | undefined;
  for (const line of body.split('\n')) {
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
      list.push(item[1].trim());
    } else if (list && /^ {6}\S/.test(line) && list.length > 0) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else if (/^ {2}\S/.test(line) && fields.scalars.size === 0 && fields.lists.size === 0) {
      fields.prose.push(line.trim());
    }
  }
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

/** `name` and `id` from the YAML frontmatter; a session file needs no other keys. */
const frontmatter = (text: string): Record<string, string> => {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  return Object.fromEntries(
    [...block.matchAll(/^([A-Za-z][\w-]*):\s*(.+)$/gm)].map(([, key, value]) => [key, value.trim()]),
  );
};

/** The first paragraph after the `#` heading, outside any fence. */
const summaryOf = (text: string): { text: string; line: number } | undefined => {
  const lines = text.split('\n');
  const heading = lines.findIndex((line) => /^# \S/.test(line));
  if (heading < 0) {
    return undefined;
  }
  for (let index = heading + 1; index < lines.length; index++) {
    const line = lines[index].trim();
    if (line.startsWith('#') || line.startsWith('```') || line.startsWith('|')) {
      return undefined;
    }
    if (line) {
      return { text: line, line: index + 1 };
    }
  }
  return undefined;
};

const lineAt = (text: string, offset: number): number => text.slice(0, offset).split('\n').length;

const blocksOf = (text: string): MdlBlock[] =>
  parseMdlBlocks(text).filter((block) => Object.hasOwn(ID_PREFIXES, block.type));

/** The blocks an append-only rule protects, as `type id` → their whole text, so any edit shows as a change. */
const protectedBlocks = (text: string): Map<string, string> =>
  new Map(
    blocksOf(text)
      .filter((block) => ['event', 'question', 'decision'].includes(block.type))
      .map((block) => [`${block.type} ${block.id}`, `${block.title ?? ''}\n${block.body}`]),
  );

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
  const answers = new Map<string, string>();
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
        if (countWords(note) > LIMITS.noteWords) {
          error(line, `${block.id}: a note has ${countWords(note)} words; the limit is ${LIMITS.noteWords}`);
        }
        sentences.push({ line, text: proseOf(note) });
      }
      return items;
    };

    switch (block.type) {
      case 'question': {
        checkTitle(LIMITS.questionWords);
        const options = (fields.lists.get('options') ?? []).map((option) => {
          const [head, ...rest] = option.split(':');
          return rest.length > 0 ? { title: head.trim(), description: rest.join(':').trim() } : { title: option };
        });
        const context = fields.scalars.get('context');
        questions.push({ id: block.id, text: title, options, ...(context ? { context } : {}) });
        break;
      }
      case 'decision': {
        const answered = fields.scalars.get('answers');
        if (answered) {
          // Only the first decision that answers a question counts (`lang/changelog.mdl` rule 10).
          if (!answers.has(answered)) {
            answers.set(answered, title);
          }
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
        const status = fields.scalars.get('status');
        if (!PR_STATUSES.some((value) => value === status)) {
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
        checkTitle(LIMITS.noteWords);
        const date = fields.scalars.get('date') ?? '';
        if (!DATE_TIME.test(date)) {
          error(line, `${block.id}: date must be ISO 8601 UTC to the minute, like 2026-11-21T11:55Z`);
        }
        const previous = timeline[timeline.length - 1];
        if (previous && date < previous.date) {
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
      question.answer = answer;
    }
  }

  if (options.previous !== undefined) {
    const now = protectedBlocks(text);
    for (const [key, before] of protectedBlocks(options.previous)) {
      const after = now.get(key);
      if (after === undefined) {
        error(1, `${key} was removed; questions, answers and the timeline are append-only`);
      } else if (after !== before) {
        error(1, `${key} was edited; append a new block instead`);
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
