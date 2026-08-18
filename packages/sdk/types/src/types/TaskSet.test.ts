//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref, Type } from '@dxos/echo';

import * as Milestone from './Milestone';
import * as Task from './Task';
import * as TaskSet from './TaskSet';

/**
 * The derived views are the whole point of the flat-array model — hierarchy, milestone grouping,
 * and progress are computed, never stored, so these assert the two can never disagree.
 */
describe('TaskSet', () => {
  test('typename, version, and array defaults', ({ expect }) => {
    expect(Type.getTypename(TaskSet.TaskSet)).toBe('org.dxos.type.taskSet');
    expect(Type.getVersion(TaskSet.TaskSet)).toBe('0.3.0');
    const taskSet = TaskSet.make({ name: 'Work' });
    expect(taskSet.tasks).toEqual([]);
    expect(taskSet.milestones).toEqual([]);
  });

  test('roots and sub-tasks partition the flat array', ({ expect }) => {
    const parent = Task.make({ title: 'Parent' });
    const child = Task.make({ title: 'Child', parentTask: Ref.make(parent) });
    const grandchild = Task.make({ title: 'Grandchild', parentTask: Ref.make(child) });
    const tasks = [parent, child, grandchild];

    expect(TaskSet.rootTasks(tasks).map((task) => task.title)).toEqual(['Parent']);
    expect(TaskSet.subTasks(tasks, parent).map((task) => task.title)).toEqual(['Child']);
    expect(TaskSet.subTasks(tasks, child).map((task) => task.title)).toEqual(['Grandchild']);
  });

  test('a task whose parent is absent reads as a root rather than vanishing', ({ expect }) => {
    const absent = Task.make({ title: 'Absent' });
    const orphan = Task.make({ title: 'Orphan', parentTask: Ref.make(absent) });

    expect(TaskSet.rootTasks([orphan]).map((task) => task.title)).toEqual(['Orphan']);
  });

  test('sub-tasks inherit the nearest ancestor milestone, and an own milestone overrides', ({ expect }) => {
    const first = Milestone.make({ name: 'First' });
    const second = Milestone.make({ name: 'Second' });
    const parent = Task.make({ title: 'Parent', milestone: Ref.make(first) });
    const inherits = Task.make({ title: 'Inherits', parentTask: Ref.make(parent) });
    const overrides = Task.make({ title: 'Overrides', parentTask: Ref.make(parent), milestone: Ref.make(second) });
    const deep = Task.make({ title: 'Deep', parentTask: Ref.make(inherits) });
    const backlog = Task.make({ title: 'Backlog' });
    const tasks = [parent, inherits, overrides, deep, backlog];

    expect(TaskSet.tasksForMilestone(tasks, first).map((task) => task.title)).toEqual(['Parent', 'Inherits', 'Deep']);
    expect(TaskSet.tasksForMilestone(tasks, second).map((task) => task.title)).toEqual(['Overrides']);
    expect(TaskSet.backlogTasks(tasks).map((task) => task.title)).toEqual(['Backlog']);
  });

  test('a parentTask cycle terminates instead of hanging', ({ expect }) => {
    const first = Task.make({ title: 'First' });
    const second = Task.make({ title: 'Second', parentTask: Ref.make(first) });
    Obj.update(first, (first) => {
      first.parentTask = Ref.make(second);
    });

    expect(TaskSet.backlogTasks([first, second]).map((task) => task.title)).toEqual(['First', 'Second']);
  });

  test('progress counts done over non-cancelled, so a milestone cannot disagree with its tasks', ({ expect }) => {
    const milestone = Milestone.make({ name: 'Ship' });
    const tasks = [
      Task.make({ title: 'a', status: 'done', milestone: Ref.make(milestone) }),
      Task.make({ title: 'b', status: 'todo', milestone: Ref.make(milestone) }),
      Task.make({ title: 'c', status: 'cancelled', milestone: Ref.make(milestone) }),
    ];

    expect(TaskSet.milestoneProgress(tasks, milestone)).toEqual({ total: 2, done: 1, ratio: 0.5 });
  });

  test('an empty milestone reports zero rather than complete', ({ expect }) => {
    const milestone = Milestone.make({ name: 'Empty' });

    expect(TaskSet.milestoneProgress([], milestone)).toEqual({ total: 0, done: 0, ratio: 0 });
  });
});
