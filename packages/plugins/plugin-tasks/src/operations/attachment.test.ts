//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { Blob, Database, Filter, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { File, Milestone, Task, TaskSet } from '@dxos/types';

import addAttachment from './add-attachment.ts';
import createTask from './create-task.ts';
import removeAttachment from './remove-attachment.ts';

const testLayer = TestDatabaseLayer({
  types: [Blob.Blob, File.File, Milestone.Milestone, Task.Task, TaskSet.TaskSet],
});

/** Descriptions of the task's change entries after its `created` one, oldest first. */
const notes = (task: Task.Task) =>
  (task.history ?? []).filter((entry) => entry.event === 'updated').map((entry) => entry.description);

describe('task attachments', () => {
  it.effect('attaches once and logs it, then removes, deletes the file and logs that', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Fix the layout' });
      const file = yield* File.fromBytes(new Uint8Array([1, 2, 3]), { name: 'screenshot.png', type: 'image/png' });
      yield* Database.add(file);
      yield* Database.flush();

      const actor = { name: 'Rich', role: 'user' as const };
      yield* addAttachment.handler({ task: Ref.make(task), file: Ref.make(file), actor });
      yield* addAttachment.handler({ task: Ref.make(task), file: Ref.make(file), actor });
      expect(task.attachments?.map((ref) => Task.refEntityId(ref))).toEqual([file.id]);
      expect(notes(task)).toEqual(['Attached "screenshot.png".']);
      expect(task.history?.at(-1)?.actor?.name).toEqual('Rich');

      yield* removeAttachment.handler({ task: Ref.make(task), file: Ref.make(file) });
      expect(task.attachments).toEqual([]);
      expect(notes(task)).toEqual(['Attached "screenshot.png".', 'Removed attachment "screenshot.png".']);
      expect(yield* Database.query(Filter.type(File.File)).run).toHaveLength(0);
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect('leaves a file the task does not hold alone', () =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(TaskSet.make({ name: 'Sprint' }));
      yield* Database.flush();
      const { task } = yield* createTask.handler({ taskSet: Ref.make(taskSet), title: 'Fix the layout' });
      const file = yield* File.fromBytes(new Uint8Array([1]), { name: 'other.png', type: 'image/png' });
      yield* Database.add(file);
      yield* Database.flush();

      yield* removeAttachment.handler({ task: Ref.make(task), file: Ref.make(file) });
      expect(notes(task)).toEqual([]);
      expect(yield* Database.query(Filter.type(File.File)).run).toHaveLength(1);
    }).pipe(Effect.provide(testLayer)),
  );
});
