//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { Milestone, Person, Task } from '@dxos/types';

import { groupTasks, sortTasks } from './task-order.ts';

const make = (props: Partial<Obj.MakeProps<typeof Task.Task>> & { title: string }) =>
  Task.make({ status: 'todo', ...props });

const titles = (tasks: readonly Task.Task[]) => tasks.map(({ title }) => title);

describe('sortTasks', () => {
  const low = make({ title: 'Low', priority: 'low', estimate: 'l', status: 'done' });
  const urgent = make({ title: 'urgent', priority: 'urgent', estimate: 's', status: 'started' });
  const none = make({ title: 'None', status: 'backlog' });
  const tasks = [low, urgent, none];

  test('manual keeps the set order', ({ expect }) => {
    expect(sortTasks(tasks, { field: 'manual', direction: 'desc' })).to.eq(tasks);
    expect(sortTasks(tasks, undefined)).to.eq(tasks);
  });

  test('status follows the status table', ({ expect }) => {
    expect(titles(sortTasks(tasks, { field: 'status', direction: 'asc' }))).to.deep.eq(['None', 'urgent', 'Low']);
  });

  test('priority puts the most urgent first and unset last', ({ expect }) => {
    expect(titles(sortTasks(tasks, { field: 'priority', direction: 'asc' }))).to.deep.eq(['urgent', 'Low', 'None']);
    expect(titles(sortTasks(tasks, { field: 'priority', direction: 'desc' }))).to.deep.eq(['None', 'Low', 'urgent']);
  });

  test('estimate runs smallest first', ({ expect }) => {
    expect(titles(sortTasks(tasks, { field: 'estimate', direction: 'asc' }))).to.deep.eq(['urgent', 'Low', 'None']);
  });

  test('title ignores case', ({ expect }) => {
    expect(titles(sortTasks(tasks, { field: 'title', direction: 'asc' }))).to.deep.eq(['Low', 'None', 'urgent']);
  });

  test('created follows the ids, which are creation-ordered', ({ expect }) => {
    const ordered = [...tasks].sort((left, right) => (left.id < right.id ? -1 : 1));
    expect(sortTasks(tasks, { field: 'created', direction: 'asc' })).to.deep.eq(ordered);
    expect(sortTasks(tasks, { field: 'created', direction: 'desc' })).to.deep.eq([...ordered].reverse());
  });

  test('updated reads the latest history entry, newest last ascending', ({ expect }) => {
    const older = make({ title: 'Older', history: [{ event: 'created', date: '2026-01-01T00:00:00Z' }] });
    const newer = make({
      title: 'Newer',
      history: [
        { event: 'created', date: '2025-01-01T00:00:00Z' },
        { event: 'updated', date: '2026-06-01T00:00:00Z' },
      ],
    });
    expect(titles(sortTasks([newer, older], { field: 'updated', direction: 'asc' }))).to.deep.eq(['Older', 'Newer']);
    expect(titles(sortTasks([older, newer], { field: 'updated', direction: 'desc' }))).to.deep.eq(['Newer', 'Older']);
  });

  test('ties keep the set order', ({ expect }) => {
    const first = make({ title: 'First', priority: 'high' });
    const second = make({ title: 'Second', priority: 'high' });
    expect(titles(sortTasks([second, first], { field: 'priority', direction: 'desc' }))).to.deep.eq([
      'Second',
      'First',
    ]);
  });
});

describe('groupTasks', () => {
  const ns = 'test';

  test('none has no groups', ({ expect }) => {
    expect(groupTasks([make({ title: 'One' })], 'none', { ns })).to.be.undefined;
  });

  test('status groups follow the status table, a task with none reading as todo', ({ expect }) => {
    const unset = Task.make({ title: 'Unset' });
    const done = make({ title: 'Done', status: 'done' });
    const groups = groupTasks([done, unset], 'status', { ns }) ?? [];
    const nonEmpty = groups.filter((group) => group.tasks.length > 0);
    expect(nonEmpty.map(({ id }) => id)).to.deep.eq(['status-todo', 'status-done']);
    expect(titles(nonEmpty[0].tasks)).to.deep.eq(['Unset']);
  });

  test('priority groups run urgent first, unset last', ({ expect }) => {
    const groups = groupTasks([make({ title: 'Low', priority: 'low' }), make({ title: 'Unset' })], 'priority', {
      ns,
    });
    expect(groups?.map(({ id }) => id)).to.deep.eq([
      'priority-urgent',
      'priority-high',
      'priority-medium',
      'priority-low',
      'priority-none',
    ]);
    expect(groups?.at(-1)?.label).to.deep.eq(['group-no-priority.label', { ns }]);
  });

  test('milestone groups follow the set, and a sub-task inherits its parent milestone', ({ expect }) => {
    const alpha = Milestone.make({ name: 'Alpha' });
    const beta = Milestone.make({ name: 'Beta' });
    const parent = make({ title: 'Parent', milestone: Ref.make(beta) });
    const child = make({ title: 'Child', parentTask: Ref.make(parent) });
    const loose = make({ title: 'Loose' });
    const groups = groupTasks([parent, child, loose], 'milestone', { ns, milestones: [alpha, beta] }) ?? [];
    expect(groups.map(({ label }) => label)).to.deep.eq(['Alpha', 'Beta', ['group-no-milestone.label', { ns }]]);
    expect(titles(groups[1].tasks)).to.deep.eq(['Parent', 'Child']);
    expect(titles(groups[2].tasks)).to.deep.eq(['Loose']);
  });

  test('assignee groups merge the same person, sort by name, and put unassigned last', ({ expect }) => {
    const kai = Obj.make(Person.Person, { fullName: 'Kai' });
    const tasks = [
      make({ title: 'Riley 1', assignee: { email: 'riley@example.com' } }),
      make({ title: 'Kai 1', assignee: { contact: Ref.make(kai) } }),
      make({ title: 'Nobody' }),
      make({ title: 'Kai 2', assignee: { contact: Ref.make(kai) } }),
    ];
    const groups = groupTasks(tasks, 'assignee', { ns }) ?? [];
    expect(groups.map(({ label }) => label)).to.deep.eq([
      'Kai',
      'riley@example.com',
      ['group-unassigned.label', { ns }],
    ]);
    expect(titles(groups[0].tasks)).to.deep.eq(['Kai 1', 'Kai 2']);
    expect(titles(groups[2].tasks)).to.deep.eq(['Nobody']);
  });
});
