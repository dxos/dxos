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
import { type MakeRequired } from '@dxos/util';

import * as Actor from './Actor';
import * as Milestone from './Milestone';

//
// Priority
//

export const Priority = Schema.Literals(['none', 'low', 'medium', 'high', 'urgent']);
export type Priority = Schema.Schema.Type<typeof Priority>;

/**
 * `icon` sits beside `color` so a row, its picker and the form's select cannot name the same
 * priority with different glyphs. The ramp is neutral — shape carries the level — which is what
 * leaves `urgent` the only coloured one and so the only one findable in a long list. The extra
 * field is inert to `SelectOption`, which carries id/title/color and ignores the rest.
 */
export const PriorityOptions: { id: Priority; title: string; color: string; icon: string }[] = [
  { id: 'low', title: 'Low', color: 'gray', icon: 'px--bar-low--regular' },
  { id: 'medium', title: 'Medium', color: 'gray', icon: 'px--bar-medium--regular' },
  { id: 'high', title: 'High', color: 'gray', icon: 'px--bar-high--regular' },
  { id: 'urgent', title: 'Urgent', color: 'rose', icon: 'ph--exclamation-mark--fill' },
];

/** No priority has no option row, so its glyph lives here — a dot, not an absent cell. */
export const NO_PRIORITY_ICON = 'ph--dot--regular';

//
// Estimate (T-shirt sizes)
//

export const Estimate = Schema.Literals(['xs', 's', 'm', 'l', 'xl']);
export type Estimate = Schema.Schema.Type<typeof Estimate>;

export const EstimateOptions: { id: Estimate; title: string; color: string }[] = [
  { id: 'xs', title: 'XS', color: 'gray' },
  { id: 's', title: 'S', color: 'gray' },
  { id: 'm', title: 'M', color: 'gray' },
  { id: 'l', title: 'L', color: 'gray' },
  { id: 'xl', title: 'XL', color: 'gray' },
];

//
// Status
//

export const Status = Schema.Literals([
  'todo',
  'backlog',
  'duplicate',
  'started',
  'review',
  'done',
  'blocked',
  'cancelled',
  'failed',
]);
export type Status = Schema.Schema.Type<typeof Status>;

export const StatusOptions: { id: Status; title: string; color: string }[] = [
  { id: 'todo', title: 'Todo', color: 'gray' },
  { id: 'backlog', title: 'Backlog', color: 'gray' },
  { id: 'duplicate', title: 'Duplicate', color: 'gray' },
  { id: 'started', title: 'Started', color: 'sky' },
  { id: 'review', title: 'In Review', color: 'cyan' },
  { id: 'done', title: 'Done', color: 'green' },
  { id: 'blocked', title: 'Blocked', color: 'rose' },
  { id: 'cancelled', title: 'Cancelled', color: 'rose' },
  { id: 'failed', title: 'Failed', color: 'rose' },
];

/**
 * What happened to a task, as recorded in its {@link History}. Deliberately coarser than the field
 * set: an entry says a task was assigned, not which field carried it, so the log stays readable
 * when the shape of a task changes.
 */
export const Event = Schema.Literals(['created', 'updated']);
export type Event = Schema.Schema.Type<typeof Event>;

/**
 * One line of a task's activity log. `description` is the human-readable record ("status changed
 * from todo to done"), so a reader needs nothing but the entry to understand what happened; the
 * `event` is what a filter or an icon keys on.
 */
export const HistoryEntry = Schema.Struct({
  date: Format.DateTime.annotate({ title: 'Date' }),
  actor: Schema.optional(Actor.Actor.annotate({ title: 'Actor' })),
  event: Event.annotate({ title: 'Event' }),
  description: Schema.optional(Schema.String.annotate({ title: 'Description' })),
}).annotate({ title: 'History Entry' });
export type HistoryEntry = Schema.Schema.Type<typeof HistoryEntry>;

export class Task extends Type.makeObject<Task>(DXN.make('org.dxos.type.task', '0.5.0'))(
  Schema.Struct({
    title: Schema.String.pipe(
      Schema.annotate({ title: 'Title' }),
      GeneratorAnnotation.set({
        generator: 'lorem.words',
        args: [{ min: 3, max: 10 }],
      }),
    ),
    description: Schema.optional(
      Schema.String.pipe(
        Schema.annotate({ title: 'Description' }),
        GeneratorAnnotation.set({
          generator: 'lorem.paragraphs',
          args: [{ min: 1, max: 3 }],
        }),
      ),
    ),

    /**
     * Parent in the sub-task hierarchy (unbounded depth); unset means a root task. App-level: the
     * ECHO parent edge means membership in the owning TaskSet, so nothing cascades through this field.
     */
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
            options: StatusOptions,
          },
        },
      }),
      Schema.optional,
    ),

    // TODO(burdon): Customize or opinionated?
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
            options: PriorityOptions,
          },
        },
      }),
      Schema.optional,
    ),

    estimate: Estimate.pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      GeneratorAnnotation.set({
        generator: 'helpers.arrayElement',
        args: [Estimate.literals],
      }),
      Schema.annotate({
        title: 'Estimate',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: EstimateOptions,
          },
        },
      }),
      Schema.optional,
    ),

    /** Human or agent assignment: a HALO identity (DID), a Person ref, a bare email, or a display name. */
    assignee: Schema.optional(Actor.Actor.annotate({ title: 'Assignee' })),

    /**
     * Who must look at the finished work. Non-empty means the task goes to `review` rather than
     * `done`, so delegated work comes back to whoever asked for it.
     */
    reviewers: Schema.optional(Schema.Array(Actor.Actor).annotate({ title: 'Reviewers' })),

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

    /**
     * What the task produced — the documents, sketches and records made while working it. Refs
     * rather than an ECHO parent edge: an artifact belongs to the project (or wherever it was
     * filed) and merely records which task made it, so completing a task must not cascade to it.
     */
    artifacts: Schema.optional(
      Schema.Array(Ref.Ref(Obj.Unknown)).pipe(
        Annotation.FormInputAnnotation.set(false),
        Schema.annotate({ title: 'Artifacts' }),
      ),
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
// Mutations. Every edit that should be remembered goes through one of these, so the log cannot
// drift from the task: a caller writing a field directly leaves no entry, and a caller writing an
// entry by hand can describe something that never happened. Each one is a single `Obj.update`, so
// the change and its note reach the database together.
//
// Only the fields a person edits are covered. `parentTask` and `milestone` carry ownership and set
// membership, so they move through `TaskSet` rather than here.
//

/**
 * Fields an edit may set — the editable surface of a task, shared by the mutation helpers here, the
 * `UpdateTask` operation, and the list UI, so the three cannot disagree about what an edit is.
 *
 * `null` clears an optional field, distinct from `undefined`, which means the edit does not mention
 * it at all. `parentTask` and `milestone` are absent by design: they carry ownership and set
 * membership, so they move through `TaskSet`.
 */
export type Edit = {
  title?: string;
  description?: string | null;
  status?: Status;
  priority?: Priority | null;
  estimate?: Estimate | null;
  assignee?: Actor.Actor | null;
};

/**
 * A new task: `title` required, every other field optional. Nothing is nullable — a create has
 * nothing to clear, and a field it does not mention is simply unset.
 */
export type Draft = MakeRequired<{ [K in keyof Edit]: Exclude<Edit[K], null> }, 'title'>;

export type EditOptions = {
  /** Who did it; omitted for something the system did on its own. */
  actor?: Actor.Actor;
  /** When, ISO-8601. Defaults to now; supplied by a caller replaying or backdating a change. */
  date?: string;
  /** Replaces the generated note — for a caller that knows why, not just what. */
  description?: string;
  /**
   * The caller is signing off as a reviewer, so `done` means `done` (see {@link approve}). Set by a
   * surface acting for a person; an agent tool must never set it.
   */
  approve?: boolean;
};

/** How an actor reads in a note: whatever identifies them, most human-readable first. */
const actorLabel = (actor: Actor.Actor): string =>
  actor.name ?? actor.email ?? actor.identityDid ?? (actor.role === 'assistant' ? 'an agent' : 'someone');

/** Compared on what identifies an actor, so re-assigning the same person records nothing. */
const sameActor = (a: Actor.Actor | undefined, b: Actor.Actor | undefined): boolean => {
  if (!a || !b) {
    return a === b;
  }

  return (
    a.name === b.name &&
    a.email === b.email &&
    a.identityDid === b.identityDid &&
    a.role === b.role &&
    refEntityId(a.contact) === refEntityId(b.contact)
  );
};

/** A title in a note, bounded: the log is read as prose, and a paragraph-long title buries it. */
const quote = (value: string): string => (value.length > 60 ? `"${value.slice(0, 57)}..."` : `"${value}"`);

/**
 * Appends one entry to a task's log. Append-only by convention, so this adds rather than rewrites;
 * prefer {@link update}, which writes the entry and the change it describes together.
 */
export const appendHistory = (task: Task, entry: HistoryEntry): void => {
  Obj.update(task, (task) => {
    task.history = [...(task.history ?? []), entry];
  });
};

/**
 * A finish nobody has signed off on lands in `review`, not `done`: a task naming {@link Task.reviewers}
 * does not close without them.
 *
 * The rule lives on the write rather than in a verb of its own because every caller that finishes a
 * task — the planning tool, `UpdateTask`, the list's own checkbox — simply asks for `done`, and none
 * of them know a task has reviewers. Sited anywhere else it has to be re-remembered at each new call
 * site, which is exactly how the first one was missed.
 *
 * Only {@link approve} is exempt. An earlier version exempted `review → done` instead, reasoning that
 * only a reviewer could make that move — but an agent asking for `done` twice makes it too: the first
 * call lands the task in `review` and the second reads as the sign-off. Who is asking is not
 * recoverable from the status, so the caller has to say.
 */
const finishStatus = (task: Task, status: Status, approve: boolean): Status =>
  status === 'done' && !approve && (task.reviewers?.length ?? 0) > 0 ? 'review' : status;

/**
 * Applies `changes` and records ONE entry describing them — an edit is what the person did, not
 * one note per field they touched.
 *
 * Fields already holding the given value are skipped, so a no-op edit writes nothing at all and
 * returns `undefined`: a log full of "status changed from done to done" is a log nobody reads.
 */
export const update = (task: Task, requested: Edit, options: EditOptions = {}): HistoryEntry | undefined => {
  const changes: Edit =
    requested.status === undefined
      ? requested
      : { ...requested, status: finishStatus(task, requested.status, options.approve ?? false) };
  const notes: string[] = [];

  if (changes.title !== undefined && changes.title !== task.title) {
    notes.push(`Title changed to ${quote(changes.title)}.`);
  }
  if (changes.description !== undefined && (changes.description ?? undefined) !== task.description) {
    notes.push(changes.description === null ? 'Description cleared.' : 'Description updated.');
  }
  if (changes.status !== undefined && changes.status !== task.status) {
    notes.push(
      task.status === undefined
        ? `Status set to ${changes.status}.`
        : `Status changed from ${task.status} to ${changes.status}.`,
    );
  }
  if (changes.priority !== undefined && (changes.priority ?? undefined) !== task.priority) {
    notes.push(
      changes.priority === null
        ? 'Priority cleared.'
        : task.priority === undefined
          ? `Priority set to ${changes.priority}.`
          : `Priority changed from ${task.priority} to ${changes.priority}.`,
    );
  }
  if (changes.estimate !== undefined && (changes.estimate ?? undefined) !== task.estimate) {
    notes.push(changes.estimate === null ? 'Estimate cleared.' : `Estimate set to ${changes.estimate.toUpperCase()}.`);
  }
  if (changes.assignee !== undefined && !sameActor(changes.assignee ?? undefined, task.assignee)) {
    notes.push(changes.assignee === null ? 'Unassigned.' : `Assigned to ${actorLabel(changes.assignee)}.`);
  }

  if (notes.length === 0) {
    return undefined;
  }

  const entry: HistoryEntry = {
    date: options.date ?? new Date().toISOString(),
    ...(options.actor ? { actor: options.actor } : {}),
    event: 'updated',
    description: options.description ?? notes.join(' '),
  };

  // One transaction: the fields and the entry that explains them are never separately observable.
  Obj.update(task, (task) => {
    if (changes.title !== undefined) {
      task.title = changes.title;
    }
    // Optional fields are cleared with `delete` rather than an `undefined` assignment, which the
    // property schema rejects on validation.
    if (changes.description !== undefined) {
      if (changes.description === null) {
        delete task.description;
      } else {
        task.description = changes.description;
      }
    }
    if (changes.status !== undefined) {
      task.status = changes.status;
    }
    if (changes.priority !== undefined) {
      if (changes.priority === null) {
        delete task.priority;
      } else {
        task.priority = changes.priority;
      }
    }
    if (changes.estimate !== undefined) {
      if (changes.estimate === null) {
        delete task.estimate;
      } else {
        task.estimate = changes.estimate;
      }
    }
    if (changes.assignee !== undefined) {
      if (changes.assignee === null) {
        delete task.assignee;
      } else {
        task.assignee = changes.assignee;
      }
    }
    task.history = [...(task.history ?? []), entry];
  });

  return entry;
};

/** Moves a task to `status`, recording the transition it actually made (see {@link finishStatus}). */
export const setStatus = (task: Task, status: Status, options?: EditOptions): HistoryEntry | undefined =>
  update(task, { status }, options);

/**
 * Closes a task on a reviewer's say-so — the one write that may reach `done` past named reviewers.
 * Reserved for a surface that acts for a person; never wire an agent tool to it.
 */
export const approve = (task: Task, options?: EditOptions): HistoryEntry | undefined =>
  update(task, { status: 'done' }, { ...options, approve: true });

/**
 * Records an object the task produced. Refs, not children: the artifact belongs to wherever it was
 * filed, and finishing the task must not cascade to it. Adding the same object twice is a no-op —
 * compared by entity id, since the same object may be addressed local or space-qualified.
 */
export const addArtifact = (task: Task, artifact: Obj.Unknown): void => {
  const id = artifact.id;
  if ((task.artifacts ?? []).some((ref) => refEntityId(ref) === id)) {
    return;
  }
  Obj.update(task, (task) => {
    task.artifacts = [...(task.artifacts ?? []), Ref.make(artifact)];
  });
};

/** Assigns a task, or unassigns it with `null`. */
export const setAssignee = (
  task: Task,
  assignee: Actor.Actor | null,
  options?: EditOptions,
): HistoryEntry | undefined => update(task, { assignee }, options);

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
