//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Migration, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Outline, TaskSet } from '@dxos/types';

import * as Instructions from './Instructions';
import * as Routine from './Routine';
import * as Skill from './Skill';

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
export class Project extends Type.makeObject<Project>(DXN.make('org.dxos.type.project', '0.5.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),

    /** Work-stream lifecycle state. */
    status: Schema.optional(ProjectStatus),

    /** Owned agent instructions (created + parented at the plugin layer). */
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions).pipe(FormInlineAnnotation.set(true))),

    /** Artifacts (documents, outliners, tables, ...) the project owns, in order. */
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(Annotation.FormInputAnnotation.set(false)),

    /** Routines the project owns, in order. Parented, so they cascade-delete with the project. */
    routines: Schema.Array(Ref.Ref(Routine.Routine)).pipe(Annotation.FormInputAnnotation.set(false)),

    /** Ad hoc markdown checklist — the scratch surface; project chats write into it. */
    outline: Schema.optional(Ref.Ref(Outline.Outline)),

    /** Owned (or adopted synced) task container, holding the project's tasks and milestones. */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
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
 * Project schema v0.4.0 — before the project owned its routines.
 * @deprecated Use {@link Project} (v0.5.0); {@link migrations} carries v0.4.0 objects forward.
 */
export class Project_v0_4_0 extends Type.makeObject<Project_v0_4_0>(DXN.make('org.dxos.type.project', '0.4.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    status: Schema.optional(ProjectStatus),
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions)),
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)),
    outline: Schema.optional(Ref.Ref(Outline.Outline)),
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
  }),
) {}

// `Filter.type` matches the versioned type exactly, so without this a v0.4.0 project stops being
// returned by every project query.
const _routinesMigration = Migration.define({
  from: Project_v0_4_0,
  to: Project,
  transform: async ({ name, description, status, instructions, artifacts, outline, taskSet }) => ({
    name,
    description,
    status,
    instructions,
    artifacts,
    outline,
    taskSet,
    routines: [],
  }),
});

/** Schema migrations for {@link Project}, for a plugin to contribute to `ClientCapabilities.Migration`. */
export const migrations = [_routinesMigration];

/**
 * Factory wrapper around `Obj.make` for {@link Project}.
 *
 * Materializes the owned task set and scratch outline unless the caller supplies them: there is no UI
 * to add either to a project that lacks one, so a project without them has nowhere to put its tasks
 * and nothing to draft in. Each parent edge is set alongside its ref so both cascade when the project
 * is deleted.
 *
 * Takes no `routines`: only {@link addRoutine} sets the parent edge that makes one owned, so a ref
 * accepted here would advertise ownership the object does not have.
 */
export const make = (
  props: Omit<Partial<Obj.MakeProps<typeof Project>>, 'artifacts' | 'routines'> & {
    artifacts?: ReadonlyArray<Ref.Ref<Obj.Unknown>>;
  } = {},
): Project => {
  const project = Obj.make(Project, { ...props, artifacts: props.artifacts ?? [], routines: [] });
  if (!props.taskSet) {
    const taskSet = TaskSet.make();
    // Ref before parent edge: the ref is what declares the edge (see `Obj.isDeclaredParentEdge`).
    Obj.update(project, (project) => {
      project.taskSet = Ref.make(taskSet);
    });
    Obj.setParent(taskSet, project);
  }
  if (!props.outline) {
    const outline = Outline.make({ name: props.name });
    Obj.update(project, (project) => {
      project.outline = Ref.make(outline);
    });
    Obj.setParent(outline, project);
    // The outline's text is a separate object, parented to the outline so it cascades too.
    if (outline.content.target) {
      Obj.setParent(outline.content.target, outline);
    }
  }
  return project;
};

/**
 * Adds a routine to the project as an owned child: the ref (which declares the edge) and the parent
 * edge, so a single `Database.add` of the project persists it and deleting the project removes it.
 */
export const addRoutine = (project: Project, routine: Routine.Routine): void => {
  Obj.update(project, (project) => {
    project.routines = [...project.routines, Ref.make(routine)];
  });
  Obj.setParent(routine, project);
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
