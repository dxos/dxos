//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as OperationTag from '@dxos/app-toolkit/OperationTag';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Database, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';
import { CodeProjectSkillDefinition } from '#skills';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Project verbs projected as MCP tools (MILESTONE-5.md §7.2/§7.4).
 *
 * Deliberately a leaf module: it imports only compute/echo/keys, so a remote host (edge
 * operation-service, workerd) can load these definitions without dragging the app-only graph
 * that `ProjectOperation`'s creation verbs pull in (`@dxos/app-framework`,
 * `@dxos/assistant-toolkit`). Placement is about that import graph, not about projectability:
 * `projects.create` is itself projected as `projectCreate` (#12591) and a host satisfies its
 * `Capability.Service` by building a PluginManager, as the CLI gateway does.
 *
 * Exported as its own namespace (not re-exported through `ProjectOperation`): the namespace-export
 * lint rule forbids re-exporting an `@import-as-namespace` module's members individually.
 */

export const ListProjects = Operation.make({
  meta: {
    key: makeKey('projectList'),
    name: 'List Projects',
    description:
      'List the projects in the space: id, name, status, description, goal count, and whether a task set is linked.',
    icon: 'ph--list-bullets--regular',
    tags: [OperationTag.Assistant, OperationTag.Database],
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
        goalCount: Schema.Number,
      }),
    ),
  }),
}).pipe(
  Operation.mcpTool({ name: 'projectList', safety: 'read', aspect: 'projects', skill: CodeProjectSkillDefinition }),
);

export const GetProject = Operation.make({
  meta: {
    key: makeKey('projectGet'),
    name: 'Get Project',
    description:
      'Read a project in full: status, goals, task-set summary (open/total per set), outline, and artifacts.',
    icon: 'ph--info--regular',
    tags: [OperationTag.Assistant, OperationTag.Database],
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
    goals: Schema.Array(Project.Goal),
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
}).pipe(
  Operation.mcpTool({ name: 'projectGet', safety: 'read', aspect: 'projects', skill: CodeProjectSkillDefinition }),
);

export const UpdateProject = Operation.make({
  meta: {
    key: makeKey('projectUpdate'),
    name: 'Update Project',
    description: 'Patch a project: name, status, description, or the goals list (what done means).',
    icon: 'ph--pencil-simple--regular',
    tags: [OperationTag.Assistant, OperationTag.Database],
  },
  services: [Database.Service],
  input: Schema.Struct({
    project: Ref.Ref(Project.Project),
    name: Schema.optional(Schema.String),
    status: Schema.optional(Project.ProjectStatus),
    description: Schema.optional(Schema.String),
    /** Replaces the goals list wholesale; omit to leave goals untouched. */
    goals: Schema.optional(Schema.Array(Project.Goal)),
  }),
  // JSON snapshot, not a live object — see MILESTONE-5.md §7.4.
  output: Schema.Struct({
    project: Schema.Unknown,
  }),
}).pipe(
  Operation.mcpTool({ name: 'projectUpdate', safety: 'write', aspect: 'projects', skill: CodeProjectSkillDefinition }),
);
