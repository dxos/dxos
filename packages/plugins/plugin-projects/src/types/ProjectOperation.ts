//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

/**
 * Every project verb the project skill drives, and the only module it needs for them.
 *
 * `Create` is the one that reaches beyond compute/echo: templates are a capability, so it declares
 * `Capability.Service`. That costs a remote host (edge operation-service, workerd) nothing it does
 * not already load — the workerd capability barrel imports `@dxos/app-framework/Capability`
 * itself — and a host contributing no templates still creates a blank project, because the handler
 * appends the built-in blank as a fallback. The mailbox pipelines, which do pull an app-only graph
 * (`@dxos/plugin-inbox`, `@dxos/ai`), live in `ProjectMailboxOperation` for that reason.
 */

/**
 * Programmatic project creation — the entry point other plugins use to create (and pre-wire)
 * projects without reaching into plugin internals. Resolves the template (blank by default),
 * scaffolds the owned instructions/artifacts graph, and files the project in the Projects section.
 */
export const Create = Operation.make({
  meta: {
    // `projectCreate`, not `create`: the whole key derives the tool name, so a bare `create` would
    // read as `projects-create` — accurate, but the verb alone is too generic to stand on its own.
    key: DXN.make('org.dxos.operation.projects.create'),
    name: 'Create Project',
    description:
      'Creates a project and its owned graph: agent instructions, an artifacts collection, and a ' +
      'task set for its tasks. Returns the project with a `taskSet` reference — pass that reference ' +
      'to taskCreate to record work against it.',
    icon: 'ph--stack--regular',
  },
  services: [Capability.Service, Database.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Template id (`ProjectCapabilities.Template`); defaults to the blank template. */
    templateId: Schema.optional(Schema.String),
    /** The object the project is created for (passed to the template's `appliesTo`/`scaffold`). */
    subject: Schema.optional(Obj.Unknown),
  }),
  output: Schema.Struct({
    id: Schema.String,
    subject: Schema.Array(Schema.String),
    project: Type.getSchema(Project.Project),
  }),
}).pipe(Operation.mutation('write'));

export const GetProject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.get'),
    name: 'Get Project',
    description: 'Read a project in full: status, task-set summary (open/total per set), outline, and artifacts.',
    icon: 'ph--info--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project),
  }),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    status: Schema.optional(Project.ProjectStatus),
    description: Schema.optional(Schema.String),
    taskSet: Schema.optional(
      Schema.Struct({
        id: Schema.String,
        name: Schema.optional(Schema.String),
        openCount: Schema.Number,
        totalCount: Schema.Number,
      }),
    ),
    /** The project's checklist markdown, when it has an outline. */
    outline: Schema.optional(Schema.Struct({ id: Schema.String, content: Schema.String })),
    artifacts: Schema.Array(Schema.Struct({ id: Schema.String, typename: Schema.String })),
  }),
}).pipe(Operation.mutation('none'));

export const UpdateProject = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.update'),
    name: 'Update Project',
    description: 'Patch a project: name, status, or description.',
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project),
    name: Schema.optional(Schema.String),
    status: Schema.optional(Project.ProjectStatus),
    description: Schema.optional(Schema.String),
  }),
  // JSON snapshot, not a live object — see MILESTONE-5.md §7.4.
  output: Schema.Struct({
    project: Type.getSchema(Project.Project),
  }),
}).pipe(Operation.mutation('write'));

//
// Artifacts — the project's work products. The skill's own verbs: `Project.artifacts` is a plain
// ref array, but adding is idempotent by entity id, which a generic object patch cannot be.
//

export const ArtifactAdd = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.addArtifact'),
    name: 'Add project artifact',
    icon: 'ph--stack-plus--regular',
    description: trim`
      Files an object into a project's artifacts collection.
      Use this after creating an object (document, outline, sheet, contact, …) while working in a
      project's context, so the project owns it and it appears in the project's artifacts list.
      Adding the same object twice is a no-op.
    `,
  },
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({
      description: 'The project to file into (its reference is in the chat context).',
    }),
    object: Ref.Ref(Obj.Unknown).annotate({
      description: 'The object to file as an artifact.',
    }),
  }),
  output: Schema.Void,
  services: [Database.Service],
});

/** One artifact row: enough to identify and load the object, without inlining its content. */
export const ArtifactInfo = Schema.Struct({
  dxn: Schema.String,
  typename: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
});

export const ArtifactList = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.projects.listArtifact'),
    name: 'List project artifacts',
    icon: 'ph--stack--regular',
    description: trim`
      Lists the objects in a project's artifacts collection (DXN, type, and label per artifact).
      Use this to find what the project already holds before searching the whole space; load an
      artifact's content with the database-load tool when needed.
    `,
  },
  input: Schema.Struct({
    project: Ref.Ref(Project.Project).annotate({
      description: 'The project whose artifacts to list (its reference is in the chat context).',
    }),
  }),
  output: Schema.Struct({
    artifacts: Schema.Array(ArtifactInfo),
  }),
  services: [Database.Service],
});
