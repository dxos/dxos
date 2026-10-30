//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Project from '@dxos/compute/Project';
import { DXN, Obj, Ref, Type } from '@dxos/echo';

/** The 0.1.0 status, which also said whether work had started. */
export const Status = Schema.Literals(['planned', 'in-progress', 'prototype', 'operational', 'failing']);
export type Status = Schema.Schema.Type<typeof Status>;

/** The 0.1.0 code link, frozen here so a later change to `Feature.CodeLink` cannot break reading old data. */
const CodeLink = Schema.Struct({
  path: Schema.String,
  line: Schema.Number,
  symbol: Schema.optional(Schema.String),
  kind: Schema.Literals(['suite', 'test', 'code']),
});

const Position = Schema.Struct({ x: Schema.Number, y: Schema.Number });

/** A 0.1.0 subfeature: a name and a status inside its feature, where 0.2.0 makes it a feature of its own. */
export const Subfeature = Schema.Struct({ name: Schema.String, status: Status });
export type Subfeature = Schema.Schema.Type<typeof Subfeature>;

/**
 * The `Feature` before subfeatures became features and work left the status, kept solely so `Migration.define` can
 * read existing data. Never constructed by this plugin.
 */
export class Feature extends Type.makeObject<Feature>(DXN.make('org.dxos.type.feature', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    status: Status,
    specs: Schema.optional(Schema.Array(Schema.String)),
    subfeatures: Schema.optional(Schema.Array(Subfeature)),
    project: Schema.optional(Ref.Ref(Project.Project)),
    code: Schema.optional(Schema.Array(CodeLink)),
    position: Schema.optional(Position),
  }),
) {}

/** Work in progress is now read from a feature's tasks, so `in-progress` keeps only what it said about maturity. */
export const toStatus = (status: Status): Exclude<Status, 'in-progress'> =>
  status === 'in-progress' ? 'planned' : status;

/**
 * The 0.2.0 `Feature`, before specs: a feature sat on a project's map (`project`) or under another feature
 * (`parent`), and held its own canvas position. Kept solely so `Migration.define` can read existing data.
 */
export class FeatureV2 extends Type.makeObject<FeatureV2>(DXN.make('org.dxos.type.feature', '0.2.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    requirements: Schema.optional(
      Schema.Array(Schema.Struct({ id: Schema.optional(Schema.String), text: Schema.String })),
    ),
    status: Schema.Literals(['planned', 'prototype', 'operational', 'failing']),
    specs: Schema.optional(Schema.Array(Schema.String)),
    parent: Schema.optional(Schema.suspend((): Ref.RefSchema<FeatureV2> => Ref.Ref(FeatureV2))),
    project: Schema.optional(Ref.Ref(Project.Project)),
    code: Schema.optional(Schema.Array(CodeLink)),
    position: Schema.optional(Position),
  }),
) {}

/**
 * The 0.3.0 `Feature`, which held its provenance in `specs` where 0.4.0 holds it as foreign keys. Kept solely so
 * `Migration.define` can read existing data.
 */
export class FeatureV3 extends Type.makeObject<FeatureV3>(DXN.make('org.dxos.type.feature', '0.3.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    requirements: Schema.optional(
      Schema.Array(Schema.Struct({ id: Schema.optional(Schema.String), text: Schema.String })),
    ),
    status: Schema.Literals(['planned', 'prototype', 'operational', 'failing']),
    specs: Schema.optional(Schema.Array(Schema.String)),
    spec: Schema.optional(Ref.Ref(Obj.Unknown)),
    code: Schema.optional(Schema.Array(CodeLink)),
  }),
) {}
