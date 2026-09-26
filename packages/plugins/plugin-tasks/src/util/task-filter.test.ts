//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj, Ref, Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { Task } from '@dxos/types';

import { filterTasks } from './task-filter.ts';

const tagUrgent = Tag.make({ label: 'urgent' });
const tagLater = Tag.make({ label: 'later' });
const tags: Tag.Map = {
  [Obj.getURI(tagUrgent).toString()]: tagUrgent,
  [Obj.getURI(tagLater).toString()]: tagLater,
};

const makeTask = (props: Partial<Task.Task> & { title: string }, tagged: Tag.Tag[] = []): Task.Task => {
  const task = Task.make({ status: 'todo', ...props } as Task.Task);
  if (tagged.length > 0) {
    Obj.update(task, (task) => {
      for (const tag of tagged) {
        Obj.addTag(task, Ref.make(tag));
      }
    });
  }
  return task;
};

const builder = new QueryBuilder(tags);
const build = (input: string) => {
  const { filter } = builder.build(input);
  if (!filter) {
    throw new Error(`Failed to build filter: ${input}`);
  }
  return filter;
};

describe('filterTasks', () => {
  // The evaluator itself is tested in `@dxos/echo-query`; these pin what a task exposes to it.
  test('free text reads the title and the description, and nothing else', ({ expect }) => {
    const titled = makeTask({ title: 'Ship the tasks section' });
    const described = makeTask({ title: 'Ship it', description: 'Blocked on the migration.' });
    const assigned = makeTask({ title: 'Ship it', assignee: { name: 'Riley' } });
    const titles = (input: string) =>
      filterTasks([titled, described, assigned], { filter: build(input) }).map(({ title }) => title);
    expect(titles('tasks')).to.deep.eq(['Ship the tasks section']);
    expect(titles('MIGRATION')).to.deep.eq(['Ship it']);
    expect(titles('riley')).to.deep.eq([]);
  });

  test('tag and property terms reach the task', ({ expect }) => {
    const urgent = makeTask({ title: 'Urgent', status: 'started' }, [tagUrgent]);
    const later = makeTask({ title: 'Later', status: 'done' }, [tagLater]);
    const titles = (input: string) => filterTasks([urgent, later], { filter: build(input) }).map(({ title }) => title);
    expect(titles('#urgent')).to.deep.eq(['Urgent']);
    expect(titles('status:done')).to.deep.eq(['Later']);
    expect(titles('assignee:riley')).to.deep.eq([]);
  });

  test('no terms keeps everything', ({ expect }) => {
    const tasks = [makeTask({ title: 'One' }), makeTask({ title: 'Two' })];
    expect(filterTasks(tasks)).to.deep.eq(tasks);
  });

  test('a matching sub-task carries its ancestors', ({ expect }) => {
    const parent = makeTask({ title: 'Parent' });
    const child = makeTask({ title: 'Child needle', parentTask: Ref.make(parent) });
    const other = makeTask({ title: 'Unrelated' });
    const kept = filterTasks([parent, child, other], { filter: build('needle') });
    expect(kept.map(({ title }) => title)).to.deep.eq(['Parent', 'Child needle']);
  });

  test('order follows the input, not the match', ({ expect }) => {
    const first = makeTask({ title: 'Alpha needle' });
    const second = makeTask({ title: 'Beta needle' });
    expect(filterTasks([second, first], { filter: build('needle') }).map(({ title }) => title)).to.deep.eq([
      'Beta needle',
      'Alpha needle',
    ]);
  });

  test('a status set keeps only the statuses it names', ({ expect }) => {
    const tasks = [
      makeTask({ title: 'Open' }),
      makeTask({ title: 'Running', status: 'started' }),
      makeTask({ title: 'Finished', status: 'done' }),
    ];
    const kept = filterTasks(tasks, { statuses: new Set<Task.Status>(['todo', 'started']) });
    expect(kept.map(({ title }) => title)).to.deep.eq(['Open', 'Running']);
  });

  test('an empty status set keeps nothing', ({ expect }) => {
    const tasks = [makeTask({ title: 'One' }), makeTask({ title: 'Two', status: 'done' })];
    expect(filterTasks(tasks, { statuses: new Set<Task.Status>() })).to.deep.eq([]);
  });

  test('a task with no status reads as todo', ({ expect }) => {
    const task = Task.make({ title: 'Unset' } as Task.Task);
    expect(filterTasks([task], { statuses: new Set<Task.Status>(['todo']) })).to.deep.eq([task]);
    expect(filterTasks([task], { statuses: new Set<Task.Status>(['done']) })).to.deep.eq([]);
  });

  test('the query and the status set are both required', ({ expect }) => {
    const wanted = makeTask({ title: 'Roast needle', status: 'started' });
    const wrongStatus = makeTask({ title: 'Label needle', status: 'done' });
    const kept = filterTasks([wanted, wrongStatus], {
      filter: build('needle'),
      statuses: new Set<Task.Status>(['started']),
    });
    expect(kept.map(({ title }) => title)).to.deep.eq(['Roast needle']);
  });

  test('a hidden status takes the branch filed under it', ({ expect }) => {
    const parent = makeTask({ title: 'Parent', status: 'done' });
    const child = makeTask({ title: 'Child', status: 'started', parentTask: Ref.make(parent) });
    const grandchild = makeTask({ title: 'Grandchild', status: 'started', parentTask: Ref.make(child) });
    const sibling = makeTask({ title: 'Sibling', status: 'started' });
    const kept = filterTasks([parent, child, grandchild, sibling], {
      statuses: new Set<Task.Status>(['started']),
    });
    expect(kept.map(({ title }) => title)).to.deep.eq(['Sibling']);
  });

  test('a sub-task under a shown parent is judged on its own status', ({ expect }) => {
    const parent = makeTask({ title: 'Parent', status: 'started' });
    const done = makeTask({ title: 'Done child', status: 'done', parentTask: Ref.make(parent) });
    const open = makeTask({ title: 'Open child', status: 'todo', parentTask: Ref.make(parent) });
    const kept = filterTasks([parent, done, open], { statuses: new Set<Task.Status>(['started', 'todo']) });
    expect(kept.map(({ title }) => title)).to.deep.eq(['Parent', 'Open child']);
  });

  test('the query cannot bring a hidden branch back', ({ expect }) => {
    const parent = makeTask({ title: 'Parent', status: 'done' });
    const child = makeTask({ title: 'Child needle', status: 'started', parentTask: Ref.make(parent) });
    const kept = filterTasks([parent, child], {
      filter: build('needle'),
      statuses: new Set<Task.Status>(['started']),
    });
    expect(kept).to.deep.eq([]);
  });

  test('a task whose parent is outside the set is a root', ({ expect }) => {
    const absent = makeTask({ title: 'Absent parent', status: 'done' });
    const child = makeTask({ title: 'Child', status: 'started', parentTask: Ref.make(absent) });
    const kept = filterTasks([child], { statuses: new Set<Task.Status>(['started']) });
    expect(kept.map(({ title }) => title)).to.deep.eq(['Child']);
  });
});
