//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Annotation, Database, DXN, EID, Filter, Format, Obj, Query, Ref, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { FormatAnnotation } from '@dxos/echo/Format';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { type EntityId } from '@dxos/echo/Key';

import * as Actor from './Actor';
import * as Milestone from './Milestone';

export const Priority = Schema.Literals(['none', 'low', 'medium', 'high', 'urgent']);
export type Priority = Schema.Schema.Type<typeof Priority>;

export const Status = Schema.Literals(['todo', 'started', 'done', 'cancelled', 'failed']);
export type Status = Schema.Schema.Type<typeof Status>;

/**
 * What happened to a task, as recorded in its {@link History}. Deliberately coarser than the field
 * set: an entry says a task was assigned, not which field carried it, so the log stays readable
 * when the shape of a task changes.
 */
export const Event = Schema.Literals([
  'created',
  'updated',
  'status-changed',
  'assigned',
  'moved',
  'commented',
  'delegated',
]);
export type Event = Schema.Schema.Type<typeof Event>;

/**
 * One line of a task's activity log. `description` is the human-readable record ("status changed
 * from todo to done"), so a reader needs nothing but the entry to understand what happened; the
 * `event` is what a filter or an icon keys on.
 */
export const HistoryEntry = Schema.Struct({
  /** When it happened, ISO-8601 — a string rather than a Date so an entry survives serialization. */
  date: Format.DateTime.annotate({ title: 'Date' }),
  /** Who did it: absent for something the system did on its own. */
  actor: Schema.optional(Actor.Actor.annotate({ title: 'Actor' })),
  event: Event.annotate({ title: 'Event' }),
  description: Schema.String.annotate({ title: 'Description' }),
}).annotate({ title: 'History Entry' });
export type HistoryEntry = Schema.Schema.Type<typeof HistoryEntry>;

export class Task extends Type.makeObject<Task>(DXN.make('org.dxos.type.task', '0.4.0'))(
  Schema.Struct({
    title: Schema.String.pipe(
      Schema.annotate({ title: 'Title' }),
      GeneratorAnnotation.set({
        generator: 'lorem.words',
        args: [{ min: 3, max: 10 }],
      }),
    ),
    description: Schema.optional(
      Schema.String.annotate({ title: 'Description' }).pipe(
        GeneratorAnnotation.set({
          generator: 'lorem.paragraphs',
          args: [{ min: 1, max: 3 }],
        }),
      ),
    ),
    priority: Priority.pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      GeneratorAnnotation.set({
        generator: 'helpers.arrayElement',
        args: [Priority.literals],
      }),
      Schema.annotate({
        title: 'Priority',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: [
              { id: 'none', title: 'None', color: 'gray' },
              { id: 'low', title: 'Low', color: 'indigo' },
              { id: 'medium', title: 'Medium', color: 'purple' },
              { id: 'high', title: 'High', color: 'amber' },
              { id: 'urgent', title: 'Urgent', color: 'red' },
            ],
          },
        },
      }),
      Schema.optional,
    ),
    status: Status.pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      GeneratorAnnotation.set({
        generator: 'helpers.arrayElement',
        args: [['todo', 'started', 'done']],
      }),
      Schema.annotate({
        title: 'Status',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: [
              { id: 'todo', title: 'Todo', color: 'indigo' },
              { id: 'started', title: 'Started', color: 'purple' },
              { id: 'done', title: 'Done', color: 'amber' },
              { id: 'cancelled', title: 'Cancelled', color: 'gray' },
              { id: 'failed', title: 'Failed', color: 'red' },
            ],
          },
        },
      }),
      Schema.optional,
    ),

    /** Human or agent assignment: a HALO identity (DID), a Person ref, a bare email, or a display name. */
    assignee: Schema.optional(Actor.Actor.annotate({ title: 'Assignee' })),
    estimate: Schema.optional(Schema.Number.annotate({ title: 'Estimate' })),

    /**
     * Parent in the sub-task hierarchy (unbounded depth); unset means a root task. App-level: the
     * ECHO parent edge means membership in the owning TaskSet, so nothing cascades through this field.
     */
    // `Schema.suspend` because the type refers to itself; clear the field with `delete` rather
    // than an `undefined` assignment, which the suspended schema rejects on validation.
    parentTask: Schema.optional(
      Schema.suspend((): Ref.RefSchema<Task> => Ref.Ref(Task).annotate({ title: 'Parent Task' })),
    ),

    /**
     * Execution-ordering dependencies: this task is ready to start only when every referenced
     * task is `done`. Orthogonal to `parentTask` (hierarchy) and `milestone` (grouping).
     */
    dependsOn: Schema.optional(
      Schema.Array(Schema.suspend((): Ref.RefSchema<Task> => Ref.Ref(Task))).annotate({ title: 'Depends On' }),
    ),

    /**
     * The milestone this task belongs to; unset means backlog. A sub-task inherits its nearest
     * ancestor's milestone at read time unless it sets its own (matching Linear).
     */
    milestone: Schema.optional(Ref.Ref(Milestone.Milestone).annotate({ title: 'Milestone' })),

    /**
     * Activity log, oldest first. Append-only by convention: an entry records something that
     * happened, so rewriting one would be rewriting the past. It lives on the task rather than in a
     * side channel because the log is worthless if it can be separated from what it describes.
     */
    history: Schema.optional(
      Schema.Array(HistoryEntry).pipe(Annotation.FormInputAnnotation.set(false), Schema.annotate({ title: 'History' })),
    ),

    // Set membership is the `TaskSet.tasks` array (flat, ordered, sub-tasks included), not a
    // backref here: enumeration stays one array read and a move stays one field write.
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-circle--regular', hue: 'neutral' }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Task>): Task => Obj.make(Task, props);

//
// Derived views over a task list. Nothing here is stored: hierarchy, milestone grouping and
// progress are computed from `parentTask`/`milestone`, so they cannot disagree with the refs. They
// take a plain task array rather than a container, so every holder of an ordered list — a
// `TaskSet`, a `Chat` — shares them, and compare by ref URI so a React snapshot (no resolver, no
// `.target`) works too.
//

/**
 * Entity id a ref points at, read off the URI rather than the target so an unloaded ref still
 * compares, and parsed rather than string-matched: a ref may address the same object locally
 * (`echo:///<id>`) or space-qualified (`echo://<space>/<id>`).
 */
export const refEntityId = <T extends Obj.Unknown>(ref: Ref.Ref<T> | undefined): EntityId | undefined => {
  if (!ref) {
    return undefined;
  }
  const eid = EID.tryParse(ref.uri);
  return eid ? EID.getEntityId(eid) : undefined;
};

/**
 * Drops unresolved entries and de-duplicates by id. Exported because a React caller resolves the
 * arrays through per-ref atoms and still needs the same cleanup.
 */
export const dedupeById = <T extends Obj.Unknown>(objects: ReadonlyArray<T | undefined>): T[] => {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const object of objects) {
    if (!object || seen.has(object.id)) {
      continue;
    }
    seen.add(object.id);
    result.push(object);
  }
  return result;
};

/** Entity id of a task's parent, exported so a caller walking the tree shares this module's ref-uri parse. */
export const parentTaskId = (task: Task): string | undefined => refEntityId(task.parentTask);

/**
 * Order query-loaded tasks by `refs` — the holder's array is canonical order; a query returns none.
 * A task the array does not list yet (a concurrent add observed mid-write) sorts to the end.
 */
export const orderTasks = (tasks: ReadonlyArray<Task>, refs: ReadonlyArray<Ref.Ref<Task>>): Task[] => {
  const position = new Map<string, number>();
  refs.forEach((ref, index) => {
    const id = refEntityId(ref);
    if (id !== undefined && !position.has(id)) {
      position.set(id, index);
    }
  });
  return [...tasks].sort(
    (a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
};

/** Tasks with no parent present in `tasks` — a dangling `parentTask` reads as a root, not a ghost. */
export const rootTasks = (tasks: readonly Task[]): Task[] => {
  const present = new Set(tasks.map((task) => task.id));
  return tasks.filter((task) => {
    const parent = refEntityId(task.parentTask);
    return parent === undefined || !present.has(parent);
  });
};

/** Direct sub-tasks of `task`, in the order `tasks` lists them. */
export const subTasks = (tasks: readonly Task[], task: Task): Task[] => {
  const parent = task.id;
  return tasks.filter((candidate) => refEntityId(candidate.parentTask) === parent);
};

/**
 * Whether every `dependsOn` of `task` is `done`, resolved within `tasks` — a dangling dependency
 * ref reads as satisfied, not as a permanent block.
 */
export const isTaskReady = (tasks: readonly Task[], task: Task): boolean => {
  const byId = new Map(tasks.map((candidate) => [candidate.id, candidate]));
  return (task.dependsOn ?? []).every((ref) => {
    const id = refEntityId(ref);
    const dep = id === undefined ? undefined : byId.get(id);
    return !dep || dep.status === 'done';
  });
};

/**
 * The milestone a task is shown under: its own, else the nearest ancestor's (Linear's behavior),
 * as an entity id. Undefined for a backlog task. Walks within `tasks`, so it needs no
 * dereferencing, and is cycle-safe against a malformed `parentTask` loop.
 */
export const effectiveMilestoneId = (tasks: readonly Task[], task: Task): string | undefined =>
  effectiveMilestoneIds(tasks).get(task.id);

/**
 * Every task's effective milestone in one pass, keyed by task id — the per-task walk is otherwise
 * quadratic when grouping a whole set. Exported so a caller filtering the whole set builds it once.
 * Tasks with no milestone anywhere up their chain map to `undefined`, memoized like any other result
 * so a long backlog chain is still walked once.
 */
export const effectiveMilestoneIds = (tasks: readonly Task[]): Map<string, string | undefined> => {
  const byId = new Map(tasks.map((task) => [task.id, task] as const));
  const resolved = new Map<string, string | undefined>();

  for (const task of tasks) {
    // Walk to the nearest ancestor carrying a milestone, remembering the path so the whole chain
    // is filled in at once; `visited` also terminates a malformed `parentTask` cycle.
    const path: string[] = [];
    const visited = new Set<string>();
    let cursor: Task | undefined = task;
    let found: string | undefined;

    while (cursor) {
      const cursorId = cursor.id;
      if (visited.has(cursorId)) {
        break;
      }
      visited.add(cursorId);
      if (resolved.has(cursorId)) {
        found = resolved.get(cursorId);
        break;
      }
      path.push(cursorId);
      const milestone = refEntityId(cursor.milestone);
      if (milestone !== undefined) {
        found = milestone;
        break;
      }
      const parentId: string | undefined = refEntityId(cursor.parentTask);
      cursor = parentId === undefined ? undefined : byId.get(parentId);
    }

    for (const id of path) {
      resolved.set(id, found);
    }
  }

  return resolved;
};

/** Tasks belonging to a milestone (by {@link effectiveMilestoneId}), in the set's canonical order. */
export const tasksForMilestone = (tasks: readonly Task[], milestone: Milestone.Milestone): Task[] => {
  const target = milestone.id;
  const milestoneIds = effectiveMilestoneIds(tasks);
  return tasks.filter((task) => milestoneIds.get(task.id) === target);
};

/** Tasks under no milestone — the backlog. */
export const backlogTasks = (tasks: readonly Task[]): Task[] => {
  const milestoneIds = effectiveMilestoneIds(tasks);
  return tasks.filter((task) => milestoneIds.get(task.id) === undefined);
};

export type Progress = {
  /** Tasks counted toward the milestone, i.e. excluding cancelled ones. */
  total: number;
  done: number;
  /** Fraction in [0, 1]; 0 for a milestone with nothing to do. */
  ratio: number;
};

/**
 * A milestone's progress, derived from its tasks — a milestone stores no status of its own, so
 * "met" is simply `ratio === 1`. Cancelled tasks leave the denominator (they are not work owed).
 */
export const milestoneProgress = (tasks: readonly Task[], milestone: Milestone.Milestone): Progress => {
  const counted = tasksForMilestone(tasks, milestone).filter((task) => task.status !== 'cancelled');
  const done = counted.filter((task) => task.status === 'done').length;
  return { total: counted.length, done, ratio: counted.length === 0 ? 0 : done / counted.length };
};

/**
 * Every task transitively under `task` within `tasks`, including `task` itself — the synchronous
 * counterpart of {@link collectSubtree} for a caller that already holds the list and cannot run an
 * Effect. Sees only what the list contains. Cycle-safe.
 */
export const subtree = (tasks: readonly Task[], task: Task): Task[] => {
  const collected: Task[] = [];
  const seen = new Set<string>();
  const visit = (current: Task): void => {
    if (seen.has(current.id)) {
      return;
    }
    seen.add(current.id);
    collected.push(current);
    for (const child of subTasks(tasks, current)) {
      visit(child);
    }
  };
  visit(task);
  return collected;
};

/**
 * Every task transitively under `task` (via `parentTask`), including `task` itself. Children are
 * discovered through the reverse-ref index — space-wide, loading each as it is found — rather
 * than any one set's array, since a sub-task may be filed in a different set (or none). Cycle-safe.
 */
export const collectSubtree = (task: Task): Effect.Effect<Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const subtree: Task[] = [];
    const seen = new Set<string>();
    const queue: Task[] = [task];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      if (seen.has(current.id)) {
        continue;
      }
      seen.add(current.id);
      subtree.push(current);
      const children = yield* Database.query(
        Query.select(Filter.id(current.id)).referencedBy(Task, 'parentTask'),
      ).run.pipe(Effect.orElseSucceed(() => []));
      queue.push(...children);
    }
    return subtree;
  });
