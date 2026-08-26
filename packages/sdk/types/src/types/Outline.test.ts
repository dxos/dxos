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

  describe('addTask', () => {
    test('files the task into the given set, parented for cascade', async ({ expect }) => {
      const outline = db.add(Outline.make({ name: 'Roadmap' }));
      const taskSet = db.add(TaskSet.make({ name: 'Roadmap' }));
      await db.flush();

      const task = TaskSet.addTask(db, taskSet, '  Buy milk  ');

      expect(task.title).to.eq('Buy milk');
      expect(task.status).to.eq('todo');
      // Membership is the set's array; the parent edge rides along so the task cascades with it.
      expect(taskSet.tasks.map((ref) => ref.target?.id)).to.deep.eq([task.id]);
      expect(Obj.getParent(task)?.id).to.eq(taskSet.id);
      // The outline itself owns nothing: promotion is the embedder's ledger, not the outline's.
      expect(Object.keys(outline)).to.not.contain('taskSet');
    });

    test('files every task into the same set, in order', async ({ expect }) => {
      const taskSet = db.add(TaskSet.make());
      await db.flush();

      const first = TaskSet.addTask(db, taskSet, 'First');
      const second = TaskSet.addTask(db, taskSet, 'Second');

      expect(taskSet.tasks.map((ref) => ref.target?.id)).to.deep.eq([first.id, second.id]);
    });

    test('extra props reach the task', async ({ expect }) => {
      const taskSet = db.add(TaskSet.make());
      await db.flush();

      const task = TaskSet.addTask(db, taskSet, 'Delegated', {
        status: 'started',
        assignee: { role: 'assistant' },
      });

      expect(task.status).to.eq('started');
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
