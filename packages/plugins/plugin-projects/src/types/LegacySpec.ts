//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Project from '@dxos/compute/Project';
import { DXN, Ref, Type } from '@dxos/echo';
import { SpecDocument } from '@dxos/types';

import * as Feature from './Feature.ts';

/**
 * The 0.1.0 `Spec`, which named its project (`project`) where 0.2.0 is owned by it (`Project.spec`). Kept solely so
 * `Migration.define` can read existing data. Never constructed by this plugin.
 */
export class Spec extends Type.makeObject<Spec>(DXN.make('org.dxos.type.projects.spec', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    features: Schema.Array(Schema.suspend((): Ref.RefSchema<Feature.Feature> => Ref.Ref(Feature.Feature))),
    layout: Schema.optional(
      Schema.Struct({ positions: Schema.Record(Schema.String, Schema.Struct({ x: Schema.Number, y: Schema.Number })) }),
    ),
    project: Schema.optional(Ref.Ref(Project.Project)),
    document: Schema.optional(Ref.Ref(SpecDocument.SpecDocument)),
  }),
) {}
