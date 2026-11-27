//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Task, type TaskSet } from '@dxos/types';

import { ListModule, type ListRow } from './ListModule.tsx';
import { useSupport } from './SupportContext.tsx';

const TITLE = 'Tasks';
const EMPTY = 'No tasks yet.';
const TEST_ID = 'support.tasks';

/** A task given to an agent shows who has it; one left for a person shows why it was made. */
const holderOf = (task: Task.Task): string | undefined => {
  if (task.delegate?.role !== 'assistant') {
    return undefined;
  }
  const subject = task.delegate.subject?.target;
  const who = (subject && Obj.getLabel(subject)) ?? 'an agent';
  return task.status === 'done' ? `Done by ${who}` : `Given to ${who}`;
};

const STATUS_ICON: Partial<Record<Task.Status, string>> = {
  started: 'ph--robot--regular',
  done: 'ph--check-square--regular',
};

type TaskRowsProps = {
  db: Database.Database;
  taskSet: TaskSet.TaskSet;
};

/** The set's tasks, newest first; the set's own list gives the order. */
const TaskRows = ({ db, taskSet }: TaskRowsProps) => {
  const tasks = useQuery(db, Filter.type(Task.Task));
  const [refs] = useObject(taskSet, 'tasks');
  const rows = useMemo<ListRow[]>(() => {
    const order = new Map(refs.map((ref, index) => [Task.refEntityId(ref), index]));
    return tasks
      .filter((task) => order.has(task.id))
      .sort((first, second) => (order.get(second.id) ?? 0) - (order.get(first.id) ?? 0))
      .map((task) => ({
        id: task.id,
        label: task.title,
        description: holderOf(task) ?? task.description?.split('\n')[0],
        icon: STATUS_ICON[task.status ?? 'todo'] ?? 'ph--check-square-offset--regular',
      }));
  }, [tasks, refs]);
  return <ListModule title={TITLE} rows={rows} empty={EMPTY} testId={TEST_ID} />;
};

/** The tasks made for people: every request, and every question the documents could not answer. */
export const TasksModule = () => {
  const support = useSupport();
  return support ? (
    <TaskRows db={support.space.db} taskSet={support.taskSet} />
  ) : (
    <ListModule title={TITLE} rows={[]} empty={EMPTY} testId={TEST_ID} />
  );
};
