//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Type } from '@dxos/echo';
import { Lens } from '@dxos/echo-panproto';
import { Task } from '@dxos/types';

//
// The demo lens: a `Task` viewed as a GTD task.
//
// `GtdTask` is written out, not derived — that is what lets an interface be built once against it and
// reused for every source that maps to it. It lives here rather than in `@dxos/echo-panproto` because
// `core/echo` must not depend on `sdk/types`: the mechanism ships in the package, an example lens
// ships with the types it binds.
//

/** The shape the lensed interface is written against. */
export class GtdTask extends Type.makeObject<GtdTask>(DXN.make('org.dxos.demo.GtdTask', '0.1.0'))(
  Schema.Struct({
    title: Schema.String.annotate({ title: 'Title' }),
    description: Schema.optional(Schema.String.annotate({ title: 'Notes' })),

    /** Lossy on read: `false` cannot say whether the task is `todo` or `started`. */
    done: Schema.optional(Schema.Boolean.annotate({ title: 'Done' })),
    stage: Schema.optional(Schema.Literals(['todo', 'started', 'done']).annotate({ title: 'Stage' })),
    urgency: Schema.optional(Schema.Number.annotate({ title: 'Urgency (1-5)' })),

    /** Neither exists on `Task`: both persist in the object's annotation dictionary. */
    context: Schema.optional(Schema.Literals(['@home', '@work', '@errands']).annotate({ title: 'Context' })),
    waitingOn: Schema.optional(Schema.String.annotate({ title: 'Waiting on' })),
  }).pipe(Annotation.LabelAnnotation.set(['title'])),
) {}

export const GTD_LENS_ID = 'org.dxos.demo.lens.task-as-gtd';

const URGENCY: Record<string, number> = { none: 1, low: 2, medium: 3, high: 4, urgent: 5 };

/**
 * `Task` → `GtdTask`.
 *
 * `title` and `description` are absent from the mapping: they match by name and compatible type, so
 * they map themselves. `context` and `waitingOn` are absent too, for the opposite reason — nothing on
 * `Task` corresponds, so they fall through to the overlay.
 */
export const GtdLens: Lens.Lens<Task.Task, GtdTask> = Lens.register(
  Lens.make(GTD_LENS_ID, Task.Task, GtdTask, {
    urgency: Lens.from('priority', Lens.lookup(URGENCY)),

    // The lossy split: `done` alone cannot restore `todo` vs `started`, so `put` reads the live
    // `status` (declared in `from`) to decide.
    done: {
      from: ['status'],
      get: ({ status }) => status === 'done',
      put: (done: boolean | undefined, { status }) => ({
        status: done === true ? ('done' as const) : status === 'done' ? ('todo' as const) : status,
      }),
    },
    stage: {
      from: ['status'],
      get: ({ status }) => status,
      put: (stage: 'todo' | 'started' | 'done' | undefined) => ({ status: stage }),
    },
  }),
);

export const makeDemoTask = () =>
  Task.make({
    title: 'Land the object lens',
    description: 'One object, two interfaces.',
    status: 'started',
    priority: 'high',
  });
