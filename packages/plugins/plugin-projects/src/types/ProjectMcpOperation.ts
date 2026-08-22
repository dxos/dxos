//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Project verbs projected as MCP tools (MILESTONE-5.md §7.2/§7.4).
 *
 * Deliberately a leaf module: it imports only compute/echo/keys, so a remote host (edge
 * operation-service, workerd) can load these definitions without dragging the app-only graph
 * that `ProjectOperation`'s creation verbs pull in (`@dxos/app-framework`,
 * `@dxos/assistant-toolkit`).
 *
 * Exported as its own namespace (not re-exported through `ProjectOperation`): the namespace-export
 * lint rule forbids re-exporting an `@import-as-namespace` module's members individually.
 */

export const ListProjects = Operation.make({
  meta: {
    key: makeKey('projectList'),
    name: 'List Projects',
    description: 'List the projects in the space: id, name, status, description, and whether a task set is linked.',
    icon: 'ph--list-bullets--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    /** Substring match on name (case-insensitive). */
    match: Schema.optional(Schema.String),
    limit: Schema.optional(Schema.Number).annotate({ description: 'Page size (default 50, max 200).' }),
  }),
  output: Schema.Struct({
    projects: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.optional(Schema.String),
        status: Schema.optional(Project.ProjectStatus),
        description: Schema.optional(Schema.String),
        hasTaskSet: Schema.Boolean,
      }),
    ),
  }),
}).pipe(Operation.mutation('none'));

export const GetProject = Operation.make({
  meta: {
    key: makeKey('projectGet'),
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
    key: makeKey('projectUpdate'),
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
    project: Schema.Unknown,
  }),
}).pipe(Operation.mutation('write'));

/** One artifact row: enough to identify and load the object, without inlining its content. */
export const ArtifactInfo = Schema.Struct({
  dxn: Schema.String,
  typename: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
});

export const ArtifactAdd = Operation.make({
  meta: {
    key: makeKey('artifactAdd'),
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
}).pipe(Operation.mutation('write'));

export const ArtifactList = Operation.make({
  meta: {
    key: makeKey('artifactList'),
    name: 'List project artifacts',
    icon: 'ph--stack--regular',
    description: trim`
      Lists the objects in a project's artifacts collection (DXN, type, and label per artifact).
      Use this to find what the project already holds before searching the whole space; load an
      artifact's content with the load tool when needed.
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
}).pipe(Operation.mutation('none'));
