//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import * as Trace from '@dxos/compute/Trace';
import { Database, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import answerQuestion from './answer-question.ts';
import askQuestion from './ask-question.ts';
import createTask from './create-task.ts';

const TestLayer = Layer.provideMerge(
  Trace.writerLayerNoop,
  TestDatabaseLayer({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] }),
);

const setup = Effect.gen(function* () {
  const taskSet = yield* Database.add(TaskSet.make({}));
  yield* Database.flush();
  const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Renew the domain' });
  return task;
});

describe('ask-question', () => {
  it.effect('files the question in the task history and blocks the task', () =>
    Effect.gen(function* () {
      const task = yield* setup;
      const agent = { role: 'assistant' as const, name: 'Scout' };

      const { questionId } = yield* askQuestion.handler({
        task: Ref.make(task),
        question: 'Which domain?',
        context: 'Two domains are due this month.',
        options: [{ title: 'example.com' }, { title: 'example.org' }],
        actor: agent,
      });

      expect(task.status).toBe('blocked');
      const [pending] = Task.getPendingQuestions(task.history);
      expect(pending.id).toBe(questionId);
      expect(pending.text).toBe('Which domain?');
      expect(pending.options?.map(({ title }) => title)).toEqual(['example.com', 'example.org']);
      expect(pending.actor?.name).toBe('Scout');
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('refuses a second question while the first is unanswered', () =>
    Effect.gen(function* () {
      const task = yield* setup;
      yield* askQuestion.handler({ task: Ref.make(task), question: 'Which domain?' });

      const exit = yield* Effect.exit(askQuestion.handler({ task: Ref.make(task), question: 'Asking again?' }));

      expect(Exit.isFailure(exit)).toBe(true);
      expect(Task.getQuestions(task.history)).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('records an answer once, leaving the task for the asker to unblock', () =>
    Effect.gen(function* () {
      const task = yield* setup;
      const { questionId } = yield* askQuestion.handler({ task: Ref.make(task), question: 'Which domain?' });

      const first = yield* answerQuestion.handler({
        task: Ref.make(task),
        question: questionId,
        answer: 'example.com',
      });
      const second = yield* answerQuestion.handler({
        task: Ref.make(task),
        question: questionId,
        answer: 'example.org',
      });

      expect(first.accepted).toBe(true);
      expect(second.accepted).toBe(false);
      expect(Task.getQuestions(task.history)[0].answer?.answer).toBe('example.com');
      expect(task.status).toBe('blocked');
    }).pipe(Effect.provide(TestLayer)),
  );
});
