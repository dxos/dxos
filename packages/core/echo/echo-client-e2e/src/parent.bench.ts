//
// Copyright 2026 DXOS.org
//

import { afterAll, bench, describe } from 'vitest';

import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Milestone, Task, TaskSet } from '@dxos/types';

import { blackhole } from './testing/bench-util.ts';

//
// Parent-edge reads and the task-tree walks built on them. `Obj.getParent` is a strong-dependency
// resolve, so a walk that reads every task's parent per visited node is what made opening a large
// task set quadratic; these rows price one read and the two walks the task list runs per render.
//
// The fixture matches the perf flow's: 200 tasks, half roots and half sub-tasks, in one set.
//

const TASK_COUNT = 200;
const BATCH = 10;
const BENCH_OPTIONS = { time: 500 };

const builder = await new EchoTestBuilder().open();
const { db } = await builder.createDatabase({ types: [Milestone.Milestone, Task.Task, TaskSet.TaskSet] });

const taskSet = db.add(TaskSet.make({ name: 'bench' }));
const roots = Array.from({ length: TASK_COUNT / 2 }, (unusedValue, index) =>
  TaskSet.addTask(db, taskSet, `root ${index}`),
);
const children = roots.map((root, index) => TaskSet.addTask(db, taskSet, `child ${index}`, {}, { parent: root }));
await db.flush();

const tasks = TaskSet.resolveTasks(taskSet);
if (tasks.length !== TASK_COUNT) {
  throw new Error(`fixture resolved ${tasks.length} tasks, expected ${TASK_COUNT}`);
}

let cursor = 0;
let sink = 0;

afterAll(async () => {
  blackhole([sink, tasks]);
  await builder.close();
}, 60_000);

describe('parent edges', { tags: ['manual'], timeout: 120_000 }, () => {
  // Ten reads per call so tinybench's per-callback overhead (~80ns) does not swamp a cached read.
  bench(
    `Obj.getParent x${BATCH} (sub-task → task)`,
    () => {
      for (let step = 0; step < BATCH; step++) {
        const parent = Obj.getParent(children[cursor++ % children.length]);
        sink += parent ? 1 : 0;
      }
    },
    BENCH_OPTIONS,
  );

  bench(
    `Obj.getParent x${BATCH} (root task → set)`,
    () => {
      for (let step = 0; step < BATCH; step++) {
        const parent = Obj.getParent(roots[cursor++ % roots.length]);
        sink += parent ? 1 : 0;
      }
    },
    BENCH_OPTIONS,
  );

  bench(
    `Task.orderTree (${TASK_COUNT} tasks)`,
    () => {
      sink += Task.orderTree(tasks, taskSet.tasks).length;
    },
    BENCH_OPTIONS,
  );

  bench(
    `Task.childIndex walk (${TASK_COUNT} tasks)`,
    () => {
      const childrenOf = Task.childIndex(tasks);
      for (const task of tasks) {
        sink += childrenOf(task).length;
      }
    },
    BENCH_OPTIONS,
  );
});
