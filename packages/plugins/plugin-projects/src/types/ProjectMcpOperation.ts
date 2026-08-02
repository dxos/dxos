//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation, Project } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Project verbs projected as MCP tools (MILESTONE-5.md §7.2/§7.4).
 *
 * Deliberately a leaf module: it imports only compute/echo/keys, so a remote host (edge
 * operation-service, workerd) can load these definitions without dragging the app-only graph
 * that `ProjectOperation`'s creation verbs pull in (`@dxos/app-framework`,
 * `@dxos/assistant-toolkit`). Those creation verbs are NOT projectable anyway — they resolve
 * `Capability.Service` (the template/plugin registry), which exists only inside the app.
 *
 * Re-exported from `ProjectOperation` so app callers keep one namespace.
 */

export const ListProjects = Operation.make({
  meta: {
    key: makeKey('projectList'),
    name: 'List Projects',
    description: 'List the projects in the space: id, name, description, and task-set count.',
    icon: 'ph--list-bullets--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    /** Substring match on name (case-insensitive). */
    match: Schema.optional(Schema.String),
    limit: Schema.optional(Schema.Number).annotations({ description: 'Page size (default 50, max 200).' }),
  }),
  output: Schema.Struct({
    projects: Schema.Array(
      Schema.Struct({
        id: Schema.String,
        name: Schema.optional(Schema.String),
        description: Schema.optional(Schema.String),
        taskSetCount: Schema.Number,
        goalCount: Schema.Number,
      }),
    ),
  }),
}).pipe(Operation.mcpTool({ name: 'projectList', safety: 'read', aspect: 'projects' }));

export const GetProject = Operation.make({
  meta: {
    key: makeKey('projectGet'),
    name: 'Get Project',
    description: 'Read a project in full: goals, task-set summary (open/total per set), outline, and artifacts.',
    icon: 'ph--info--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project),
  }),
  output: Schema.Struct({
    id: Schema.String,
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    goals: Schema.Array(Project.Goal),
    taskSets: Schema.Array(
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
}).pipe(Operation.mcpTool({ name: 'projectGet', safety: 'read', aspect: 'projects' }));

export const UpdateProject = Operation.make({
  meta: {
    key: makeKey('projectUpdate'),
    name: 'Update Project',
    description: 'Patch a project: name, description, or the goals list (what done means).',
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project),
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    /** Replaces the goals list wholesale; omit to leave goals untouched. */
    goals: Schema.optional(Schema.Array(Project.Goal)),
  }),
  // JSON snapshot, not a live object — see MILESTONE-5.md §7.4.
  output: Schema.Struct({
    project: Schema.Unknown,
  }),
}).pipe(Operation.mcpTool({ name: 'projectUpdate', safety: 'write', aspect: 'projects' }));
