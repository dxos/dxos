//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Outline, TaskSet } from '@dxos/types';

import * as Instructions from './Instructions';
import type * as Skill from './Skill';

/** Work-stream lifecycle state; what done means lives on the task set's milestones. */
export const ProjectStatus = Schema.Literals(['active', 'paused', 'blocked', 'ended']);
export type ProjectStatus = Schema.Schema.Type<typeof ProjectStatus>;

/**
 * A user-facing container for interactive, long-running work: instructions (skills + commands),
 * artifacts, tasks, and AI chat sessions in project context. Successor to `Topic`.
 *
 * Fields are the refs the project owns and orders; everything that merely accumulates around it is
 * a query — chats by the ECHO parent edge, routines by the connected-routines join (a routine
 * reaches its project through `instructions.objects`, like any other object), agents via chats.
 */
export class Project extends Type.makeObject<Project>(DXN.make('org.dxos.type.project', '0.4.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),

    /** Work-stream lifecycle state. */
    status: Schema.optional(ProjectStatus),

    /** Owned agent instructions (created + parented at the plugin layer). */
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions).pipe(FormInlineAnnotation.set(true))),

    /** Artifacts (documents, outliners, tables, ...) the project owns, in order. */
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(Annotation.FormInputAnnotation.set(false)),

    /** Ad hoc markdown checklist — the scratch surface; project chats write into it. */
    outline: Schema.optional(Ref.Ref(Outline.Outline)),

    /** Owned (or adopted synced) task container, holding the project's tasks and milestones. */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
  }).pipe(
    Schema.annotate({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--stack--regular', hue: 'amber' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Project}. */
export const make = (
  props: Omit<Partial<Obj.MakeProps<typeof Project>>, 'artifacts'> & {
    artifacts?: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
  } = {},
): Project => Obj.make(Project, { ...props, artifacts: props.artifacts ?? [] });

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
