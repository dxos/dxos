//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { Milestone, Task, TaskSet } from '@dxos/types';

import { type PersonKey, type PersonMap } from './team.ts';
import { daysAgo } from './util.ts';

//
// The task set, authored as a tree.
//
// `TaskSet.tasks` is flat — the hierarchy lives on `Task.parentTask`, at unbounded depth. So the
// seeds are nested for legibility and flattened on the way in, which keeps the shape of the work
// visible in the source rather than reconstructable only by following refs.
//

type TaskSeed = {
  readonly title: string;
  readonly status: Task.Status;
  readonly assignee?: PersonKey;
  readonly description?: string;
  readonly priority?: Task.Priority;
  readonly estimate?: Task.Estimate;
  /** Milestone key this task rolls up to; inherited by sub-tasks that do not name their own. */
  readonly milestone?: MilestoneKey;
  readonly subTasks?: ReadonlyArray<TaskSeed>;
};

type MilestoneKey = 'protocol' | 'merge' | 'field';

const MILESTONE_SEEDS = [
  {
    key: 'protocol',
    name: 'Sync protocol frozen',
    description: 'Wire format agreed and versioned; no further breaking changes before launch.',
  },
  {
    key: 'merge',
    name: 'Conflict-free merge',
    description: 'Two field devices editing the same note offline converge without a manual step.',
  },
  {
    key: 'field',
    name: 'Northwind field trial',
    description: 'Two weeks offline on the Northwind survey, then a clean reconciliation.',
  },
] as const;

const TASK_SEEDS: ReadonlyArray<TaskSeed> = [
  {
    title: 'Freeze the v2 sync wire format',
    status: 'done',
    assignee: 'ravi',
    priority: 'urgent',
    milestone: 'protocol',
    description: 'Version the envelope so a v1 client is rejected with a readable error, not a parse failure.',
    subTasks: [
      { title: 'Add a version byte to the envelope', status: 'done', assignee: 'ravi', estimate: 's' },
      { title: 'Reject v1 payloads with a typed error', status: 'done', assignee: 'ravi', estimate: 's' },
      {
        title: 'Write the format down in SPEC.mdl',
        status: 'done',
        assignee: 'noa',
        estimate: 'xs',
        description: 'The spec is the artifact reviewers read; the code is not.',
      },
    ],
  },
  {
    title: 'Last-writer-wins is not good enough for notes',
    status: 'started',
    assignee: 'ravi',
    priority: 'high',
    milestone: 'merge',
    estimate: 'l',
    description: 'Two people editing the same paragraph offline lose one edit. Move the note body to a CRDT.',
    subTasks: [
      { title: 'Model the note body as a sequence CRDT', status: 'done', assignee: 'ravi', estimate: 'm' },
      {
        title: 'Decide what happens to conflicting titles',
        status: 'review',
        assignee: 'noa',
        estimate: 's',
        description: 'A title is one line; a CRDT there reads as noise. Written up in DECISIONS.md.',
      },
      {
        title: 'Migrate notes written by the v1 client',
        status: 'started',
        assignee: 'imogen',
        estimate: 'm',
        subTasks: [
          { title: 'Detect a v1 note on read', status: 'done', assignee: 'imogen', estimate: 's' },
          { title: 'Convert in place, once, on first open', status: 'started', assignee: 'imogen', estimate: 's' },
          { title: 'Prove the conversion is idempotent', status: 'todo', assignee: 'lena', estimate: 's' },
        ],
      },
    ],
  },
  {
    title: 'Attachment sync eats the battery',
    status: 'todo',
    assignee: 'imogen',
    priority: 'high',
    milestone: 'field',
    estimate: 'm',
    description: 'Photos re-upload on every reconnect. Content-address them and skip what the server already has.',
    subTasks: [
      { title: 'Hash attachments on capture', status: 'todo', assignee: 'imogen', estimate: 's' },
      { title: 'Ask the server what it already holds', status: 'todo', assignee: 'ravi', estimate: 's' },
    ],
  },
  {
    title: 'Offline state has no affordance in the UI',
    status: 'started',
    assignee: 'theo',
    priority: 'medium',
    milestone: 'field',
    estimate: 's',
    description: 'Sung-min asked how anyone knows whether a note is saved. Nothing in the UI answers that.',
  },
  {
    title: 'Two-week offline soak test',
    status: 'blocked',
    assignee: 'lena',
    priority: 'high',
    milestone: 'field',
    estimate: 'l',
    description: 'Blocked on the v1 migration: soaking a format we are about to change proves nothing.',
  },
  {
    title: 'Cut 2.0-beta.1 for Northwind',
    status: 'todo',
    assignee: 'noa',
    priority: 'medium',
    milestone: 'field',
    estimate: 's',
  },
];

export type TasksResult = {
  taskSet: TaskSet.TaskSet;
  tasks: Task.Task[];
  milestones: Milestone.Milestone[];
};

/** Depth-first flatten, resolving each seed against its parent task and milestone. */
const buildTasks = (
  seeds: ReadonlyArray<TaskSeed>,
  people: PersonMap,
  milestones: Record<MilestoneKey, Milestone.Milestone>,
): Task.Task[] => {
  const tasks: Task.Task[] = [];
  const visit = (seed: TaskSeed, parent: Task.Task | undefined, milestone: MilestoneKey | undefined) => {
    const key = seed.milestone ?? milestone;
    const task = Task.make({
      title: seed.title,
      status: seed.status,
      description: seed.description,
      priority: seed.priority,
      estimate: seed.estimate,
      assignee: seed.assignee ? { contact: Ref.make(people[seed.assignee]) } : undefined,
      milestone: key ? Ref.make(milestones[key]) : undefined,
      parentTask: parent ? Ref.make(parent) : undefined,
      // Task carries no due date; its dates are activity-log lines, so that is where they go.
      history: [
        { date: daysAgo(21), event: 'created' as const, description: 'Filed against the sync v2 work-stream.' },
        ...(seed.status === 'done'
          ? [{ date: daysAgo(9), event: 'updated' as const, description: 'Status changed to done.' }]
          : []),
      ],
    });
    tasks.push(task);
    for (const child of seed.subTasks ?? []) {
      visit(child, task, key);
    }
  };

  for (const seed of seeds) {
    visit(seed, undefined, undefined);
  }
  return tasks;
};

/**
 * The project's work: three milestones and a two-level task tree.
 *
 * Hierarchy is set on the seeds rather than through a `SampleSpace` helper — `parentTask` is a Task
 * field, so a generic "children" helper would have nothing to say about it. Membership and order
 * are still the set's flat `tasks` array, which is what `SampleSpace.children` writes.
 */
export const Tasks: SampleSpace.Phase<TasksResult, PersonMap> = SampleSpace.phase('tasks', {
  schemas: [TaskSet.TaskSet, Task.Task, Milestone.Milestone],
  run: (people: PersonMap) =>
    Effect.gen(function* () {
      const taskSet = yield* Database.add(
        TaskSet.make({ name: 'Offline sync v2', description: 'Everything that has to land before the field trial.' }),
      );

      const milestones = yield* SampleSpace.seed(MILESTONE_SEEDS, (seed) =>
        Effect.succeed(Milestone.make({ name: seed.name, description: seed.description })),
      );
      yield* SampleSpace.children(taskSet, Object.values(milestones), (taskSet, refs) => {
        taskSet.milestones = refs;
      });

      const tasks = buildTasks(TASK_SEEDS, people, milestones);
      yield* SampleSpace.children(taskSet, tasks, (taskSet, refs) => {
        taskSet.tasks = refs;
      });

      // One execution dependency, so the blocked soak test reads as blocked for a stated reason
      // rather than by status alone.
      const soak = tasks.find((task) => task.title.startsWith('Two-week offline soak'));
      const migration = tasks.find((task) => task.title.startsWith('Migrate notes written'));
      if (soak && migration) {
        Obj.update(soak, (soak) => {
          soak.dependsOn = [Ref.make(migration)];
        });
      }

      return { taskSet, tasks, milestones: Object.values(milestones) };
    }),
});
