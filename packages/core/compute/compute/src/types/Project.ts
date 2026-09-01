//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Outline, Repo, TaskSet } from '@dxos/types';

import * as Instructions from './Instructions.ts';
import * as Routine from './Routine.ts';
import * as Skill from './Skill.ts';

/** Work-stream lifecycle state; what done means lives on the task set's milestones. */
export const ProjectStatus = Schema.Literals(['active', 'paused', 'blocked', 'ended']);
export type ProjectStatus = Schema.Schema.Type<typeof ProjectStatus>;

/**
 * A user-facing container for interactive, long-running work: instructions (skills + commands),
 * artifacts, tasks, and AI chat sessions in project context. Successor to `Topic`.
 *
 * Fields are the refs the project owns and orders; everything that merely accumulates around it is
 * a query — chats by the ECHO parent edge, agents via chats.
 */
export class Project extends Type.makeObject<Project>(DXN.make('org.dxos.type.project', '0.6.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),

    /** Work-stream lifecycle state. */
    status: Schema.optional(ProjectStatus),

    /** Owned agent instructions (created at the plugin layer; parented by `SetParent`). */
    instructions: Schema.optional(
      Ref.Ref(Instructions.Instructions).pipe(Annotation.SetParent.set(true), FormInlineAnnotation.set(true)),
    ),

    /** Artifacts (documents, outliners, tables, ...) the project owns, in order. */
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(Annotation.FormInputAnnotation.set(false)),

    /** Routines the project owns, in order, parented so they cascade-delete with it. */
    routines: Schema.Array(Ref.Ref(Routine.Routine)).pipe(
      Annotation.SetParent.set(true),
      Annotation.FormInputAnnotation.set(false),
    ),

    /** Ad hoc markdown checklist — the scratch surface; project chats write into it. */
    outline: Schema.optional(Ref.Ref(Outline.Outline).pipe(Annotation.SetParent.set(true))),

    /** Owned (or adopted synced) task container, holding the project's tasks and milestones. */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet).pipe(Annotation.SetParent.set(true))),

    /**
     * Source repository this project's work lands in. Independent of `taskSet`: a project that
     * mirrors a repository adopts its synced task set AND names it here, while a project whose
     * tasks are local can still reference the repository its issues are filed against.
     */
    repo: Schema.optional(Ref.Ref(Repo.Repo).annotate({ title: 'Repository' })),
  }).pipe(
    Schema.annotate({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--stack--regular', hue: 'amber' }),
    // Only the project skill: filing created objects into `artifacts` is what a project-scoped
    // session structurally needs; artifact-type skills are enabled on demand. Plain dotted key, so
    // the type does not depend on the plugin that owns the skill.
    Skill.SkillsAnnotation.set(['org.dxos.skill.project']),
  ),
) {}

/**
 * Factory wrapper around `Obj.make` for {@link Project}.
 *
 * Materializes the owned task set and scratch outline unless the caller supplies them: there is no UI
 * to add either to a project that lacks one, so a project without them has nowhere to put its tasks
 * and nothing to draft in. The parent edges follow from the fields' `SetParent` annotation.
 */
export const make = (
  props: Omit<Partial<Obj.MakeProps<typeof Project>>, 'artifacts' | 'routines'> & {
    artifacts?: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
  } = {},
): Project => {
  const project = Obj.make(Project, { ...props, artifacts: props.artifacts ?? [], routines: [] });
  if (!props.taskSet) {
    const taskSet = TaskSet.make();
    Obj.update(project, (project) => {
      project.taskSet = Ref.make(taskSet);
    });
  }
  if (!props.outline) {
    const outline = Outline.make({ name: props.name });
    Obj.update(project, (project) => {
      project.outline = Ref.make(outline);
    });
  }
  return project;
};

/** Adds a routine to the project as an owned child; `SetParent` on the field cascades it. */
export const addRoutine = (project: Project, routine: Routine.Routine): void => {
  Obj.update(project, (project) => {
    project.routines = [...project.routines, Ref.make(routine)];
  });
};

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
