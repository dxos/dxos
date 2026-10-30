//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { SessionConfig } from '@dxos/ai';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import { DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { Outline, Repo, TaskSet } from '@dxos/types';
import { trim } from '@dxos/util';

import * as Feature from './Feature.ts';

/**
 * The document that held a spec's `.mdl` text before `Spec` 0.3.0 took the `Text` itself (`content`). Kept solely so
 * `Migration.define` can read existing data.
 */
export class Document extends Type.makeObject<Document>(DXN.make('org.dxos.type.specDocument', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
  }),
) {}

/** {@link Document} as stored before its rename, under the `org.dxos.type.spec` typename. */
export class PreRenameDocument extends Type.makeObject<PreRenameDocument>(DXN.make('org.dxos.type.spec', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
  }),
) {}

/** The document the 0.1.0 → 0.2.0 migration gives a spec that had none: front matter naming it. */
export const makeDocument = (name: string): Document =>
  Obj.make(Document, {
    name,
    content: Ref.make(
      Text.make({
        content: trim`
          ---
          name: ${name}
          ---
        `,
      }),
    ),
  });

const Layout = Schema.Struct({
  positions: Schema.Record(Schema.String, Schema.Struct({ x: Schema.Number, y: Schema.Number })),
});

/**
 * The 0.1.0 `Spec`, which named its project (`project`) where 0.2.0 is owned by it (`Project.spec`). Kept solely so
 * `Migration.define` can read existing data. Never constructed by this plugin.
 */
export class Spec extends Type.makeObject<Spec>(DXN.make('org.dxos.type.projects.spec', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    features: Schema.Array(Schema.suspend((): Ref.RefSchema<Feature.Feature> => Ref.Ref(Feature.Feature))),
    layout: Schema.optional(Layout),
    project: Schema.optional(Ref.Ref(Project.Project)),
    document: Schema.optional(Ref.Ref(Document)),
  }),
) {}

/**
 * The 0.2.0 `Spec`, which held its features and layout as fields and its text in an owned {@link Document}, where 0.3.0
 * keeps features and layout as annotations and owns the `Text` itself. Kept solely so `Migration.define` can read
 * existing data. Never constructed by this plugin.
 */
export class SpecV2 extends Type.makeObject<SpecV2>(DXN.make('org.dxos.type.projects.spec', '0.2.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    features: Schema.Array(Schema.suspend((): Ref.RefSchema<Feature.Feature> => Ref.Ref(Feature.Feature))),
    layout: Schema.optional(Layout),
    document: Ref.Ref(Document),
  }),
) {}

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
