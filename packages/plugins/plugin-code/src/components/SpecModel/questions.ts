//
// Copyright 2026 DXOS.org
//

import { QUESTION_STATUSES, type QuestionStatus, parseMdlBlocks } from '@dxos/deus/extension';
import { parseFields } from '@dxos/deus/review';
import { Key } from '@dxos/echo';
import { type Task } from '@dxos/types';

import { inlineValueOf, listOf, proseOf } from './spec-model.ts';

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

/**
 * The `question` blocks of a spec, open questions first and otherwise in document order; a question with no known
 * status is dropped.
 */
export const parseQuestions = (text: string): SpecQuestion[] =>
  parseMdlBlocks(text)
    .filter(({ type, id }) => type === 'question' && id)
    .flatMap(({ id, title, body }): SpecQuestion[] => {
      const fields = parseFields(body);
      const status = inlineValueOf(fields.get('status')?.inline);
      if (!isQuestionStatus(status)) {
        return [];
      }
      const to = inlineValueOf(fields.get('to')?.inline);
      const answer = proseOf(fields.get('answer'));
      const note = proseOf(fields.get('note'));
      return [
        {
          id,
          text: title ?? '',
          status,
          ...(to && { to }),
          ...(answer && { answer }),
          decisions: listOf(fields.get('decisions')),
          affects: listOf(fields.get('affects')),
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
