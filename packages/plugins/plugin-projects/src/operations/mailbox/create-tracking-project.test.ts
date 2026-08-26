//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Message, Task } from '@dxos/types';

import { ProjectMailboxOperation } from '#types';

import createTrackingProject from './create-tracking-project';
import { seed, testLayer } from './testing';
import updateProjectTasks from './update-project-tasks';

describe('create-tracking-project', () => {
  it.effect('scaffolds the project, routine, and backfilled tasks from a message', () =>
    Effect.gen(function* () {
      const { mailbox } = yield* seed([
        { email: 'ngudmand@kirkconsult.com', name: 'Nicole Gudmand', subject: 'Monthly Meeting' },
        { email: 'mahern@kirkconsult.com', name: 'Madeline Ahern', subject: "Approval for Dmytro's payment" },
        { email: 'news@bulk.io', subject: 'Weekly digest' },
      ]);
      const feed = yield* Database.load(mailbox.feed);
      const [message] = yield* Feed.query(feed, Filter.type(Message.Message)).run;

      const result = yield* createTrackingProject.handler({ mailbox: Ref.make(mailbox), message });
      expect(result.senders).toEqual(['kirkconsult.com']);
      expect(result.pipeline).toBe('tasks');
      expect(result.tasks).toBe(2);

      const projects = yield* Database.query(Filter.type(Project.Project)).run;
      const project = projects.find((candidate) => candidate.id === result.projectId);
      expect(project?.name).toBe('Kirkconsult — Requests');

      invariant(project);
      const routines = yield* Database.query(Filter.type(Routine.Routine)).run;
      expect(routines).toHaveLength(1);
      const routine = routines[0];
      expect(routine.spec?.kind).toBe('runnable');
      expect(routine.triggers).toHaveLength(1);
      const trigger = yield* Effect.promise(() => routine.triggers[0].load());
      expect(trigger.enabled).toBe(false);
      expect(trigger.spec?.kind).toBe('feed');

      const rerun = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: result.senders,
      });
      expect(rerun.created).toBe(0);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('scope and pipeline choose who is followed and which operation the routine binds', () =>
    Effect.gen(function* () {
      const { mailbox } = yield* seed([
        { email: 'ngudmand@kirkconsult.com', name: 'Nicole Gudmand', subject: 'Monthly Meeting' },
        { email: 'mahern@kirkconsult.com', name: 'Madeline Ahern', subject: "Approval for Dmytro's payment" },
      ]);
      const feed = yield* Database.load(mailbox.feed);
      const [message] = yield* Feed.query(feed, Filter.type(Message.Message)).run;

      const result = yield* createTrackingProject.handler({
        mailbox: Ref.make(mailbox),
        message,
        scope: 'sender',
        pipeline: 'summaries',
        name: 'Nicole — Threads',
      });
      expect(result.senders).toEqual(['ngudmand@kirkconsult.com']);
      expect(result.pipeline).toBe('summaries');
      expect(result.tasks).toBe(0);
      expect((yield* Database.query(Filter.type(Task.Task)).run).length).toBe(0);

      const projects = yield* Database.query(Filter.type(Project.Project)).run;
      const project = projects.find((candidate) => candidate.id === result.projectId);
      expect(project?.name).toBe('Nicole — Threads');
      invariant(project);
      const [routine] = yield* Database.query(Filter.type(Routine.Routine)).run;
      expect(routine.spec?.kind === 'runnable' && routine.spec.runnable.uri.toString()).toContain(
        ProjectMailboxOperation.UpdateInvestorLog.meta.key.toString(),
      );
    }).pipe(Effect.provide(testLayer())),
  );
});
