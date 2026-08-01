//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';
import { Outline, Task, TaskSet } from '@dxos/types';

import * as OutlineTasks from './OutlineTasks';

describe('Outline', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    const result = await builder.createDatabase({
      types: [Outline.Outline, Text.Text, Task.Task, TaskSet.TaskSet],
    });
    db = result.db;
  });

  afterEach(async () => {
    await builder.close();
  });

  describe('getOrCreateTaskSet', () => {
    test('creates and links a task set named after the outline', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const taskSet = await OutlineTasks.getOrCreateTaskSet(outline, db);

      expect(taskSet.name).to.eq('Roadmap');
      expect(outline.taskSet?.target?.id).to.eq(taskSet.id);
    });

    test('falls back to a default name for an unnamed outline', async ({ expect }) => {
      const outline = db.add(Outline.make());
      await db.flush();

      const taskSet = await OutlineTasks.getOrCreateTaskSet(outline, db);

      expect(taskSet.name).to.eq(OutlineTasks.DEFAULT_TASK_SET_NAME);
    });

    test('links a single task set when conversions race', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const taskSets = await Promise.all([
        OutlineTasks.getOrCreateTaskSet(outline, db),
        OutlineTasks.getOrCreateTaskSet(outline, db),
      ]);

      expect(taskSets[1].id).to.eq(taskSets[0].id);
      expect(outline.taskSet?.target?.id).to.eq(taskSets[0].id);
    });

    test('reuses the linked task set', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const first = await OutlineTasks.getOrCreateTaskSet(outline, db);
      const second = await OutlineTasks.getOrCreateTaskSet(outline, db);

      expect(second.id).to.eq(first.id);
    });
  });

  describe('createTask', () => {
    test('creates a task filed into the outline task set', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const task = await OutlineTasks.createTask(outline, db, '  Buy milk  ');

      expect(task.title).to.eq('Buy milk');
      expect(task.status).to.eq('todo');
      expect(task.taskSet?.target?.id).to.eq(outline.taskSet?.target?.id);
    });

    test('files every task into the same lazily created task set', async ({ expect }) => {
      const outline = db.add(Outline.make());
      await db.flush();

      const first = await OutlineTasks.createTask(outline, db, 'First');
      const second = await OutlineTasks.createTask(outline, db, 'Second');

      expect(second.taskSet?.target?.id).to.eq(first.taskSet?.target?.id);
    });
  });
});
