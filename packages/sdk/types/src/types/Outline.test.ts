//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import * as Outline from './Outline';
import * as Task from './Task';
import * as TaskSet from './TaskSet';

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

      const taskSet = await Outline.getOrCreateTaskSet(outline, db);

      expect(taskSet.name).to.eq('Roadmap');
      expect(outline.taskSet?.target?.id).to.eq(taskSet.id);
    });

    test('falls back to a default name for an unnamed outline', async ({ expect }) => {
      const outline = db.add(Outline.make());
      await db.flush();

      const taskSet = await Outline.getOrCreateTaskSet(outline, db);

      expect(taskSet.name).to.eq(Outline.DEFAULT_TASK_SET_NAME);
    });

    test('links a single task set when conversions race', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const taskSets = await Promise.all([
        Outline.getOrCreateTaskSet(outline, db),
        Outline.getOrCreateTaskSet(outline, db),
      ]);

      expect(taskSets[1].id).to.eq(taskSets[0].id);
      expect(outline.taskSet?.target?.id).to.eq(taskSets[0].id);
    });

    test('reuses the linked task set', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const first = await Outline.getOrCreateTaskSet(outline, db);
      const second = await Outline.getOrCreateTaskSet(outline, db);

      expect(second.id).to.eq(first.id);
    });
  });

  describe('createTask', () => {
    test('parents the task to the outline task set', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      await db.flush();

      const task = await Outline.createTask(outline, db, '  Buy milk  ');

      expect(task.title).to.eq('Buy milk');
      expect(task.status).to.eq('todo');
      expect(Obj.getParent(task)?.id).to.eq(outline.taskSet?.target?.id);
    });

    test('parents every task to the same lazily created task set', async ({ expect }) => {
      const outline = db.add(Outline.make());
      await db.flush();

      const first = await Outline.createTask(outline, db, 'First');
      const second = await Outline.createTask(outline, db, 'Second');

      expect(Obj.getParent(second)?.id).to.eq(Obj.getParent(first)?.id);
    });

    test('extra props reach the task', async ({ expect }) => {
      const outline = db.add(Outline.make());
      await db.flush();

      const task = await Outline.createTask(outline, db, 'Delegated', {
        status: 'in-progress',
        assignee: { role: 'assistant' },
      });

      expect(task.status).to.eq('in-progress');
      expect(task.assignee?.role).to.eq('assistant');
    });
  });

  describe('checklist markdown', () => {
    test('parse handles both markers, either case, and ignores prose', ({ expect }) => {
      const markdown = ['# Notes', '- [ ] First', '- [x] Second', 'prose line', '* [X] Third'].join('\n');
      expect(Outline.parseChecklist(markdown)).to.deep.eq([
        { title: 'First', done: false },
        { title: 'Second', done: true },
        { title: 'Third', done: true },
      ]);
    });

    test('upsert rewrites matched lines in place and appends new ones', ({ expect }) => {
      const markdown = ['intro', '- [ ] First', '- [ ] Second'].join('\n');
      const next = Outline.upsertChecklistItems(markdown, [
        { title: 'First', done: true },
        { title: 'Third', done: false },
      ]);
      expect(next.split('\n')).to.deep.eq(['intro', '- [x] First', '- [ ] Second', '- [ ] Third']);
    });

    test('hasOpenItems', ({ expect }) => {
      expect(Outline.hasOpenItems('- [ ] a')).to.eq(true);
      expect(Outline.hasOpenItems('- [x] a')).to.eq(false);
      expect(Outline.hasOpenItems('no checklist')).to.eq(false);
    });
  });
});
