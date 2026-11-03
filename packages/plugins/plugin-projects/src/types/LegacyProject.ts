//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { SessionConfig } from '@dxos/ai';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Spec from '@dxos/compute/Spec';
import { DXN, Format, Migration, Obj, Ref, Type, type URI } from '@dxos/echo';
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
 * The 0.7.0 `Project`, which named its repositories in two fields (`repo`, `repositories`) and held a default session
 * config (`session`). Kept solely so `Migration.define` can read existing data. Never constructed by this plugin.
 */
export class ProjectV7 extends Type.makeObject<ProjectV7>(DXN.make('org.dxos.type.project', '0.7.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Format.Text),
    status: Schema.optional(Project.ProjectStatus),
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions)),
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)),
    routines: Schema.Array(Ref.Ref(Routine.Routine)),
    outline: Schema.optional(Ref.Ref(Outline.Outline)),
    specs: Schema.Array(Ref.Ref(Spec.Spec)),
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
  to: ProjectV7,
  transform: async ({ spec, ...rest }) => ({
    ...rest,
    specs: spec ? [Ref.fromURI(spec.uri)] : [],
  }),
});

/**
 * `Project` 0.7.0 → 0.8.0: the project's repositories move from `repo` and `repositories` to the
 * `Repo.RepositoriesAnnotation`, `repo` first and each repository once, and `session` is dropped.
 */
const makeProjectRepositories = (): Migration.ObjectMigration => {
  // Each project's repository URIs, read in the transform while its refs are still live.
  const repositories = new Map<string, URI.URI[]>();
  return Migration.define({
    from: ProjectV7,
    to: Project.Project,
    transform: async ({ id, repo, repositories: list, session: _session, ...rest }) => {
      const uris = [...(repo ? [repo] : []), ...(list ?? [])].map((ref) => ref.uri);
      repositories.set(
        id,
        uris.filter((uri, index) => uris.indexOf(uri) === index),
      );
      return rest;
    },
    onMigration: async ({ object }) => {
      // Written here rather than in the transform, which cannot carry refs in meta.
      const uris = repositories.get(object.id) ?? [];
      repositories.delete(object.id);
      if (uris.length > 0) {
        Repo.setRepositories(
          object,
          uris.map((uri) => Ref.fromURI(uri)),
        );
      }
    },
  });
};

export const projectRepositories = makeProjectRepositories();
