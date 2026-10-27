//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { Database, Feed, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Message } from '@dxos/types';

import { scaffoldProject } from '../../templates/index.ts';
import { TriageModel } from '../../testing/index.ts';
import { testLayer } from '../mailbox/testing.ts';
import triageMessages from './triage-messages.ts';

const post = (name: string, text: string, index: number, role: 'user' | 'assistant' = 'user') =>
  Message.make({
    created: new Date(Date.parse('2026-07-01T00:00:00.000Z') + index * 60_000).toISOString(),
    sender: { role, name },
    blocks: [{ _tag: 'text', text }],
  });

const SCRIPT: TriageModel.Script = [
  {
    match: 'customize the storage',
    result: {
      reply: 'Not yet — the team will follow up with pointers.',
      tasks: [{ kind: 'docs', title: 'Write a guide to customizing storage' }],
    },
  },
  {
    match: 'videos',
    result: {
      reply: 'Thanks Tim, short videos are a great idea.',
      tasks: [
        { kind: 'feature', title: 'Record five-minute videos on building with Composer' },
        { kind: 'action', title: 'Send Tim the recording of the BlueYard tour' },
      ],
    },
  },
];

const seed = Effect.fnUntraced(function* () {
  const { db } = yield* Database.Service;
  const feed = db.add(Feed.make({ name: 'general', namespace: 'data' }));
  yield* Effect.promise(() =>
    db.appendToFeed(feed, [
      post(
        'Tim',
        'We had a tour of Composer last month. Do you have videos on interesting things to build to get started?',
        0,
      ),
      post('nandi', '👋 hello', 1),
      post('Kai', 'Is there a guide to customize the storage? Asking for the docs bot.', 2, 'assistant'),
      post('guest', 'hi guys is there a guide on how we can customize the storage', 3),
    ]),
  );
  const project = db.add(scaffoldProject({ name: 'DXOS Community' }));
  yield* Effect.promise(() => db.flush());
  return { db, feed, project };
});

const taskTitles = Effect.fnUntraced(function* (project: ReturnType<typeof scaffoldProject>) {
  invariant(project.taskSet, 'Project has no task set.');
  const taskSet = yield* Database.load(project.taskSet);
  const tasks = yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
  return tasks.map((task) => task.title);
});

describe('triage-messages', () => {
  it.effect('drafts replies to questions and files the work, skipping chatter and bots', () =>
    Effect.gen(function* () {
      const { feed, project } = yield* seed();

      const result = yield* triageMessages
        .handler({ project: Ref.make(project), feed: Ref.make(feed) })
        .pipe(Effect.provide(TriageModel.layer(SCRIPT)));
      expect(result).toEqual({ scanned: 4, replies: 2, tasks: 3 });

      expect(yield* taskTitles(project)).toEqual([
        'Reply to Tim: Do you have videos on interesting things to build to get …',
        'Feature: Record five-minute videos on building with Composer',
        'Follow up: Send Tim the recording of the BlueYard tour',
        'Reply to guest: hi guys is there a guide on how we can customize the storage',
        'Docs: Write a guide to customizing storage',
      ]);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a rerun files nothing again, and a new message is triaged on its own', () =>
    Effect.gen(function* () {
      const { db, feed, project } = yield* seed();
      const run = () =>
        triageMessages
          .handler({ project: Ref.make(project), feed: Ref.make(feed) })
          .pipe(Effect.provide(TriageModel.layer(SCRIPT)));

      yield* run();
      const rerun = yield* run();
      expect(rerun).toMatchObject({ replies: 0, tasks: 0 });
      // Only the boundary message is re-examined; the cursor keeps the rest from costing a model call.
      expect(rerun.scanned).toBe(1);

      yield* Effect.promise(() => db.appendToFeed(feed, [post('Tim', 'More videos please: one on plugins?', 10)]));
      const next = yield* run();
      expect(next).toMatchObject({ scanned: 2, replies: 1, tasks: 2 });
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a failed model call leaves the message for the next run', () =>
    Effect.gen(function* () {
      const { feed, project } = yield* seed();
      const result = yield* triageMessages
        .handler({ project: Ref.make(project), feed: Ref.make(feed) })
        .pipe(Effect.provide(AiService.notAvailable));
      expect(result).toEqual({ scanned: 4, replies: 0, tasks: 0 });

      const retried = yield* triageMessages
        .handler({ project: Ref.make(project), feed: Ref.make(feed) })
        .pipe(Effect.provide(TriageModel.layer(SCRIPT)));
      expect(retried).toMatchObject({ replies: 2, tasks: 3 });
    }).pipe(Effect.provide(testLayer())),
  );
});
