//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Collection, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Outline, TaskSet } from '@dxos/types';

import * as Instructions from './Instructions';
import * as Routine from './Routine';
import type * as Skill from './Skill';

/** Lightweight inline goal: per-item status and addressability without document ceremony. */
export const Goal = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  status: Schema.optional(Schema.Literal('open', 'met', 'dropped')),
});

export type Goal = Schema.Schema.Type<typeof Goal>;

/**
 * A user-facing container for interactive, long-running work: instructions (skills + commands),
 * routines, artifacts, and AI chat sessions in project context. Successor to `Topic`.
 * Chats and agents attach via relations/queries (assistant-toolkit depends on compute, so no typed refs here).
 */
export class Project extends Type.makeObject<Project>(DXN.make('org.dxos.type.project', '0.3.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),

    /** Owned agent instructions (created + parented at the plugin layer). */
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions).pipe(FormInlineAnnotation.set(true))),

    /** Routines created within the scope of this project. */
    routines: Schema.Array(Ref.Ref(Routine.Routine)),

    /** Owned collection of artifacts (documents, outliners, tables, ...) managed by the project. */
    artifacts: Schema.optional(Ref.Ref(Collection.Collection)),

    /** What done means for this project. */
    goals: Schema.optional(Schema.Array(Goal)),

    /** Ad hoc markdown checklist — the scratch surface; project chats write into it. */
    outline: Schema.optional(Ref.Ref(Outline.Outline)),

    /** Owned (or adopted synced) task container; membership is the ECHO parent edge. */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
  }).pipe(
    Schema.annotations({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--stack--regular', hue: 'amber' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Project}. */
export const make = (
  props: Omit<Partial<Obj.MakeProps<typeof Project>>, 'routines'> & {
    routines?: ReadonlyArray<Ref.Ref<Routine.Routine>>;
  } = {},
): Project => Obj.make(Project, { ...props, routines: props.routines ?? [] });

/** Bindings a chat session should receive when running in a project's context. */
export type ContextBindings = {
  skills: Ref.Ref<Skill.Skill>[];
  objects: Ref.Ref<Obj.Unknown>[];
};

/**
 * Bindings a chat session should receive when running in this project's context: the instructions'
 * skills and context objects. The instructions object itself is NOT bound — its text/commands reach
 * the system prompt through the chat's `instructions` ref, and a bound Instructions object would
 * render as an inert context stub. Requires the instructions ref to be resolved (`.target`);
 * unresolved refs contribute nothing.
 */
export const contextBindings = (project: Project): ContextBindings => {
  const instructionsRef = project.instructions;
  // `.target` throws when the ref has neither an inlined target nor a resolver attached
  // (e.g. an unresolved ref outside a database context); guard with `isAvailable` first.
  if (!instructionsRef?.isAvailable) {
    return { skills: [], objects: [] };
  }

  const instructions = instructionsRef.target;
  if (!instructions) {
    return { skills: [], objects: [] };
  }

  // Refs are kept as-is (never re-wrapped via `Ref.make`): bindings persist to the conversation feed,
  // and re-wrapping would drop the registry DXN of skills that have no space-DB identity.
  return {
    skills: [...instructions.skills],
    objects: [...(instructions.objects ?? [])],
  };
};
