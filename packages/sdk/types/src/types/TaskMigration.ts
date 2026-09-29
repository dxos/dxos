//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Database, DXN, Filter, Migration, Obj, Ref, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';

import * as Actor from './Actor.ts';
import * as File from './File.ts';
import * as Milestone from './Milestone.ts';
import * as Task from './Task.ts';
import * as TaskSet from './TaskSet.ts';

/**
 * A task as stored before sub-tasks were owned by their parent: hierarchy was a `parentTask` ref on
 * the child, and every task sat in its set's flat `tasks` list. Kept solely so {@link migrations}
 * can read existing data; never constructed by the app.
 */
export class LegacyTask extends Type.makeObject<LegacyTask>(DXN.make('org.dxos.type.task', '0.5.0'))(
  Schema.Struct({
    title: Schema.String,
    description: Schema.optional(Schema.String),
    parentTask: Schema.optional(Schema.suspend((): Ref.RefSchema<LegacyTask> => Ref.Ref(LegacyTask))),
    dependsOn: Schema.optional(Schema.Array(Ref.Ref(Task.Task))),
    status: Schema.optional(Task.Status),
    priority: Schema.optional(Task.Priority),
    estimate: Schema.optional(Task.Estimate),
    assignee: Schema.optional(Actor.Actor),
    reviewers: Schema.optional(Schema.Array(Actor.Actor)),
    milestone: Schema.optional(Ref.Ref(Milestone.Milestone)),
    history: Schema.optional(Schema.Array(Task.HistoryEntry)),
    artifacts: Schema.optional(Schema.Array(Ref.Ref(Obj.Unknown))),
    attachments: Schema.optional(Schema.Array(Ref.Ref(File.File))),
  }),
) {}

/** A task set as stored before sub-tasks moved out of it: `tasks` held every task, flat. */
export class LegacyTaskSet extends Type.makeObject<LegacyTaskSet>(DXN.make('org.dxos.type.taskSet', '0.3.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    image: Schema.optional(Format.URL),
    tasks: Schema.Array(Ref.Ref(Obj.Unknown)),
    milestones: Schema.Array(Ref.Ref(Milestone.Milestone)),
  }),
) {}

/**
 * Which legacy tasks become whose sub-tasks, computed once over the whole space on the first task's
 * `onMigration`: the rewrite retires `parentTask`, so a parent migrated after its children could no
 * longer find them through the typed object.
 */
type Plan = {
  /** Legacy task ids not yet migrated; a transform for an id outside it means the plan is stale. */
  pending: Set<string>;
  /** Sub-tasks per legacy parent id, in their old flat-list order — written by the parent's transform. */
  children: Map<string, Obj.Unknown[]>;
  /** Parent per child id where the parent is already migrated — the child appends itself on migration. */
  late: Map<string, Task.Task>;
};

const plans = new WeakMap<Database.Database, Plan>();

/** A legacy task as the plan reads it; `parentTask` survives only in pre-migration data. */
type PlanEntry = { object: Obj.Unknown; parentTask?: Ref.Ref<LegacyTask> };

/**
 * The plan for `current`'s run, built on its first `onMigration`. `current` has already switched
 * type by then, so it joins the still-legacy tasks from its pre-migration data.
 */
const planFor = async (db: Database.Database, current: PlanEntry): Promise<Plan> => {
  const existing = plans.get(db);
  if (existing?.pending.has(current.object.id)) {
    return existing;
  }
  const plan = await buildPlan(db, current);
  plans.set(db, plan);
  return plan;
};

const buildPlan = async (db: Database.Database, current: PlanEntry): Promise<Plan> => {
  const legacy: PlanEntry[] = (await db.query(Filter.type(LegacyTask)).run()).map((task) => ({
    object: task,
    parentTask: task.parentTask,
  }));
  if (!legacy.some((entry) => entry.object.id === current.object.id)) {
    legacy.push(current);
  }
  const sets = await db.query(Filter.type(LegacyTaskSet)).run();

  // The flat list is the only record of sibling order, and of which set a task was shown in.
  const setOf = new Map<string, string>();
  const position = new Map<string, number>();
  for (const set of sets) {
    set.tasks.forEach((ref, index) => {
      const id = Task.refEntityId(ref);
      if (id !== undefined && !setOf.has(id)) {
        setOf.set(id, set.id);
        position.set(id, index);
      }
    });
  }
  const ordered = [...legacy].sort(
    (a, b) =>
      (position.get(a.object.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.object.id) ?? Number.MAX_SAFE_INTEGER),
  );

  // Accepted in flat order, each checked against the links already accepted, so a malformed
  // `parentTask` cycle keeps its earliest-listed link and is broken at the next.
  const accepted = new Map<string, Obj.Unknown>();
  for (const { object: task, parentTask } of ordered) {
    const parent = parentTask ? (parentTask.target ?? (await parentTask.tryLoad())) : undefined;
    // A parent in another set still wins: the task follows it into that set, since a tree now lives
    // in exactly one set.
    if (!parent || Obj.getTypename(parent) !== Type.getTypename(Task.Task)) {
      continue;
    }
    let cycle = false;
    const seen = new Set<string>();
    for (let cursor: string | undefined = parent.id; cursor !== undefined && !seen.has(cursor);) {
      if (cursor === task.id) {
        cycle = true;
        break;
      }
      seen.add(cursor);
      cursor = accepted.get(cursor)?.id;
    }
    if (!cycle) {
      accepted.set(task.id, parent);
    }
  }

  // Children from the parent's own set keep their flat-list order; ones joining from another set,
  // whose positions are not comparable, follow them.
  const siblingOrder = ordered
    .map((entry) => entry.object)
    .sort((left, right) => {
      const parentSet = (task: Obj.Unknown) => setOf.get(accepted.get(task.id)?.id ?? '');
      const joins = (task: Obj.Unknown) => (setOf.get(task.id) === parentSet(task) ? 0 : 1);
      return joins(left) - joins(right);
    });

  const pending = new Set(legacy.map((entry) => entry.object.id));
  const children = new Map<string, Obj.Unknown[]>();
  const late = new Map<string, Task.Task>();
  for (const task of siblingOrder) {
    const parent = accepted.get(task.id);
    if (!parent) {
      continue;
    }
    if (pending.has(parent.id)) {
      children.set(parent.id, [...(children.get(parent.id) ?? []), task]);
    } else if (Obj.instanceOf(Task.Task, parent)) {
      late.set(task.id, parent);
    }
  }

  return { pending, children, late };
};

/**
 * `org.dxos.type.task` 0.5.0 → 0.6.0: `parentTask` becomes the parent's ordered `subtasks`, and each
 * sub-task's ECHO parent moves from the set to its parent task — across sets too, so a sub-task
 * filed in another set than its parent joins the parent's. Runs before {@link taskSetMigration},
 * which needs the parent edges this writes.
 */
export const taskMigration = Migration.define({
  from: LegacyTask,
  to: Task.Task,
  transform: (from) => {
    const { parentTask: _parentTask, ...rest } = from;
    return { ...rest, subtasks: [] };
  },
  onMigration: async ({ before, object, db }) => {
    const plan = await planFor(db, { object, parentTask: before.parentTask });
    const children = plan.children.get(object.id) ?? [];
    if (children.length > 0) {
      Obj.update(object, (object) => {
        // By URI: a child not yet migrated is still the legacy type, which a typed ref cannot name.
        object.subtasks = children.map((child) => Ref.fromURI(Obj.getURI(child)));
      });
    }
    for (const child of children) {
      Obj.setParent(child, object);
    }
    const parent = plan.late.get(object.id);
    if (parent) {
      // Its set may have migrated already and kept it as a root; the move takes it out of that list.
      const holder = Obj.getParent(object);
      TaskSet.moveTask(TaskSet.instanceOf(holder) ? holder : undefined, object, { parentTask: parent });
    }
    plan.pending.delete(object.id);
    if (plan.pending.size === 0) {
      plans.delete(db);
    }
  },
});

/**
 * `org.dxos.type.taskSet` 0.3.0 → 0.4.0: `tasks` keeps only the roots. An entry is dropped when its
 * task's parent task lists it — not merely when its parent edge is a task, since a legacy root may
 * still carry a task-parented edge, which is healed back to the set instead.
 */
export const taskSetMigration = Migration.define({
  from: LegacyTaskSet,
  to: TaskSet.TaskSet,
  transform: (from) => ({ ...from, tasks: from.tasks.map((ref) => Ref.fromURI(ref.uri)) }),
  onMigration: async ({ object }) => {
    const roots: Ref.Ref<Task.Task>[] = [];
    for (const ref of object.tasks) {
      const task = ref.target ?? (await ref.tryLoad());
      if (!Obj.instanceOf(Task.Task, task) || !isListedSubtask(task)) {
        roots.push(Ref.fromURI(ref.uri));
      }
    }
    if (roots.length !== object.tasks.length) {
      Obj.update(object, (object) => {
        object.tasks = roots;
      });
    }
    for (const ref of object.tasks) {
      const task = ref.target ?? (await ref.tryLoad());
      if (task && !isListedSubtask(task) && Obj.getParent(task)?.id !== object.id) {
        Obj.setParent(task, object);
      }
    }
  },
});

const isListedSubtask = (task: Task.Task): boolean => {
  const parent = Task.getParentTask(task);
  return parent !== undefined && (parent.subtasks ?? []).some((ref) => Task.refEntityId(ref) === task.id);
};

/** In order: the task pass writes the parent edges the set pass reads. */
export const migrations: Migration.Migration[] = [taskMigration, taskSetMigration];
