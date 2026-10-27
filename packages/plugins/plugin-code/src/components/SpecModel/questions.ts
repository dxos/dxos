//
// Copyright 2026 DXOS.org
//

import { parseMdlBlocks } from '@dxos/deus/extension';
import { Key } from '@dxos/echo';
import { type Task } from '@dxos/types';

import { parseFields } from './spec-model.ts';

/** The statuses of a `question` block (`lang/question.mdl`), in the order the viewer lists them. */
export const QUESTION_STATUSES = ['open', 'answered', 'moot'] as const;

export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/** One `question` block of a spec. */
export type SpecQuestion = {
  id: string;
  /** The inline prose: the question itself. */
  text: string;
  status: QuestionStatus;
  /** The person who must answer, `user:<handle>`. */
  to?: string;
  answer?: string;
  /** The changelog decisions that record the answer. */
  decisions: string[];
  affects: string[];
  /** Suggested answers. */
  options: string[];
  /** Why the question is moot, or who works on it. */
  note?: string;
};

const isQuestionStatus = (value?: string): value is QuestionStatus =>
  value !== undefined && (QUESTION_STATUSES as readonly string[]).includes(value);

/** An inline value without its trailing `# comment`. */
const valueOf = (inline?: string): string | undefined => inline?.replace(/\s+#.*$/, '').trim() || undefined;

/**
 * The `question` blocks of a spec, open questions first and otherwise in document order; a question with no known
 * status is dropped.
 */
export const parseQuestions = (text: string): SpecQuestion[] =>
  parseMdlBlocks(text)
    .filter(({ type, id }) => type === 'question' && id)
    .flatMap(({ id, title, body }): SpecQuestion[] => {
      const fields = parseFields(body);
      const status = valueOf(fields.get('status')?.inline);
      if (!isQuestionStatus(status)) {
        return [];
      }
      const prose = (name: string) =>
        [fields.get(name)?.inline, ...(fields.get(name)?.lines ?? [])].filter(Boolean).join(' ').trim() || undefined;
      // A list may be inline (`[a, b]`), wrapped over several lines, or written as `- a` items.
      const list = (name: string) =>
        [valueOf(fields.get(name)?.inline), ...(fields.get(name)?.lines ?? [])]
          .join(',')
          .split(',')
          .map((value) => value.replace(/^[\s[-]+|[\s\]]+$/g, ''))
          .filter(Boolean);
      const to = valueOf(fields.get('to')?.inline);
      const answer = prose('answer');
      const note = prose('note');
      return [
        {
          id,
          text: title ?? '',
          status,
          ...(to && { to }),
          ...(answer && { answer }),
          decisions: list('decisions'),
          affects: list('affects'),
          // An option is a sentence and may hold commas, so options are `- item` lines, never split on commas.
          options: (fields.get('options')?.lines ?? []).map((line) => line.replace(/^-\s*/, '')).filter(Boolean),
          ...(note && { note }),
        },
      ];
    })
    .sort((left, right) => QUESTION_STATUSES.indexOf(left.status) - QUESTION_STATUSES.indexOf(right.status));

/**
 * A spec question in the shape of an agent's question thread, so the task UI can render it. Ids derive from the
 * question id, so a re-render keeps them stable; the date is empty because a spec question has none.
 */
export const toQuestionThread = (question: SpecQuestion): Task.QuestionThread => {
  const questionId = Key.EntityId.deterministic('spec-question', question.id);
  return {
    question: {
      id: questionId,
      date: '',
      event: 'question',
      text: question.text,
      ...(question.note && { context: question.note }),
      ...(question.options.length > 0 && { options: question.options.map((title) => ({ title })) }),
    },
    ...(question.status === 'answered' &&
      question.answer && {
        answer: {
          id: Key.EntityId.deterministic('spec-answer', question.id),
          date: '',
          event: 'answer',
          questionId,
          answer: question.answer,
        },
      }),
  };
};
