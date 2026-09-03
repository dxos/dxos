//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { scaffoldProject } from '../../templates/index.ts';
import { makeMessage, seed, testLayer } from './testing.ts';
import updateProjectTasks from './update-project-tasks.ts';

describe('update-project-tasks', () => {
  it.effect('tracks requests as tasks, idempotently, preserving user edits', () =>
    Effect.gen(function* () {
      const { db, feed, mailbox, project } = yield* seed([
        { email: 'ngudmand@kirkconsult.com', name: 'Nicole Gudmand', subject: "Dmytro's July Pmt - Approval" },
        { email: 'mahern@kirkconsult.com', name: 'Madeline Ahern', subject: "Approval for Dmytro's payment" },
        { email: 'news@bulk.io', subject: 'Weekly digest' },
      ]);

      const first = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(first).toMatchObject({ scanned: 3, matched: 2, created: 2 });

      const tasks = yield* Database.query(Filter.type(Task.Task)).run;
      expect(tasks.map((task) => task.title).sort()).toEqual([
        "Approval for Dmytro's payment",
        "Dmytro's July Pmt - Approval",
      ]);

      Obj.update(tasks[0], (task) => {
        task.status = 'done';
      });
      const rerun = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(rerun.created).toBe(0);
      expect((yield* Database.query(Filter.type(Task.Task)).run).length).toBe(2);

      yield* Effect.promise(() =>
        db.appendToFeed(feed, [
          makeMessage({ email: 'mkirkendall@kirkconsult.com', subject: 'July invoice approval' }, 9),
        ]),
      );
      const incremental = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(incremental.created).toBe(1);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('a message sharing the cursor’s timestamp is not dropped', () =>
    Effect.gen(function* () {
      const { db, feed, mailbox, project } = yield* seed([{ email: 'first@kirkconsult.com', subject: 'First at T' }]);

      const first = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(first).toMatchObject({ created: 1 });

      yield* Effect.promise(() =>
        db.appendToFeed(feed, [makeMessage({ email: 'second@kirkconsult.com', subject: 'Second at T' }, 0)]),
      );
      const second = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(second).toMatchObject({ created: 1 });
      expect((yield* Database.query(Filter.type(Task.Task)).run).length).toBe(2);
    }).pipe(Effect.provide(testLayer())),
  );

  it.effect('two projects tracking one mailbox keep independent cursors', () =>
    Effect.gen(function* () {
      const { db, mailbox, project } = yield* seed([
        { email: 'ngudmand@kirkconsult.com', subject: 'Kirk approval' },
        { email: 'billing@acme.com', subject: 'Acme invoice' },
      ]);
      const second = db.add(scaffoldProject({ name: 'Acme Project' }));
      yield* Effect.promise(() => db.flush());

      const kirk = yield* updateProjectTasks.handler({
        project: Ref.make(project),
        mailbox: Ref.make(mailbox),
        senders: ['kirkconsult.com'],
      });
      expect(kirk).toMatchObject({ matched: 1, created: 1 });

      const acme = yield* updateProjectTasks.handler({
        project: Ref.make(second),
        mailbox: Ref.make(mailbox),
        senders: ['acme.com'],
      });
      expect(acme).toMatchObject({ matched: 1, created: 1 });
    }).pipe(Effect.provide(testLayer())),
  );
});
