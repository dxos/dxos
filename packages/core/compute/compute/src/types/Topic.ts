//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

//
// PRIORITIES
//
// TODO(burdon): Move type to compute; keep Project as generic/low-level.
//
// - Reconcile with Project (linear/github use cases).
// - Model goals via instructions (ISSUE: Dependency on compute).
// - Project as low-level type; Brain has higher-level concept that wraps?
//   - Focus, Initiative, Plan, Mission, Objective, Goal,
//     Objective (Goal)
//     └── Key Result
//         └── Initiative
//             └── Project
//                 └── Task
// - Basic datastructure and article UI
// - Task management (via skills); spawn agents, etc.
// - FactStore persistence (Feed/ECHO?)
//

/**
 * A meta-thread: a cluster of related conversations with an optional label/summary. Authoritative in
 * ECHO; string-keyed thread references (like `Thread.messageIds`) until the entity layer firms up to
 * DXN refs.
 */
// TODO(burdon): Generalize beyond email (threads, task lists); reconcile with Project.
export class Topic extends Type.makeObject<Topic>(DXN.make('org.dxos.type.topic', '0.1.0'))(
  Schema.Struct({
    label: Schema.String,

    // Ref to an agent-instructions object (created + linked at the plugin layer, e.g. plugin-brain).
    // TODO(burdon): Now that Topic lives in `@dxos/compute` alongside `Instructions` (no more
    // `types → compute → ai → types` cycle), tighten this to `Ref.Ref(Instructions.Instructions)`.
    instructions: Ref.Ref(Obj.Unknown).pipe(FormInlineAnnotation.set(true), Schema.optional),

    // TODO(burdon): Uncouple from Email; Model via Refs?
    // TODO(burdon): Refs to other objects in context?
    threadIds: Schema.Array(Schema.String),
    participants: Schema.Array(Schema.String),
    keywords: Schema.Array(Schema.String),

    // TODO(burdon): Artifacts.
    summary: Schema.String,
    // Open questions and action items rolled up from the topic's member threads.
    questions: Schema.Array(Schema.String),
    // TODO(burdon): Reconcile with plugin-outliner; and task skill.
    tasks: Schema.Array(Schema.String),
  }).pipe(
    Schema.annotations({ title: 'Topic' }),
    LabelAnnotation.set(['label']),
    Annotation.IconAnnotation.set({ icon: 'ph--stack--regular', hue: 'rose' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Topic}. */
export const make = (props: Partial<Obj.MakeProps<typeof Topic>> = {}): Topic =>
  Obj.make(Topic, {
    label: '',
    summary: '',
    threadIds: [],
    participants: [],
    keywords: [],
    questions: [],
    tasks: [],
    ...props,
  });
