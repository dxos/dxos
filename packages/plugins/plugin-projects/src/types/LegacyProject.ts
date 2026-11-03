//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { SessionConfig } from '@dxos/ai';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import { DXN, Format, Migration, Obj, Ref, Type } from '@dxos/echo';
import { Outline, Repo, TaskSet } from '@dxos/types';

/**
 * The 0.6.0 `Project`, which owned at most one spec (`spec`) where 0.7.0 owns a list (`specs`). Kept solely so
 * `Migration.define` can read existing data. Never constructed by this plugin.
 */
export class ProjectV6 extends Type.makeObject<ProjectV6>(DXN.make('org.dxos.type.project', '0.6.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Format.Text),
    status: Schema.optional(Project.ProjectStatus),
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions)),
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)),
    routines: Schema.Array(Ref.Ref(Routine.Routine)),
    outline: Schema.optional(Ref.Ref(Outline.Outline)),
    spec: Schema.optional(Ref.Ref(Obj.Unknown)),
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
    repo: Schema.optional(Ref.Ref(Repo.Repo)),
    repositories: Schema.optional(Schema.Array(Ref.Ref(Repo.Repo))),
    session: Schema.optional(SessionConfig.SessionConfig),
  }),
) {}

/**
 * `Project` 0.6.0 → 0.7.0: a project owns a list of specs (`specs`) where it owned at most one (`spec`). Runs before any
 * migration of the specs a project owns, so each finds the project's specs where 0.7.0 keeps them.
 */
export const projectSpecs = Migration.define({
  from: ProjectV6,
  to: Project.Project,
  transform: async ({ spec, ...rest }) => ({
    ...rest,
    specs: spec ? [Ref.fromURI(spec.uri)] : [],
  }),
});
