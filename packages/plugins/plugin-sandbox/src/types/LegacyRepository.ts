//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

/**
 * The EDGE repository type before it folded into `Repo`, kept solely so `Migration.define` can read
 * existing data and convert it. Never constructed by this plugin; its object id was the repository's
 * id on EDGE, which the migration carries over as the `Repo`'s EDGE key.
 */
export class Repository extends Type.makeObject<Repository>(DXN.make('org.dxos.type.repository', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    defaultBranch: Schema.optional(Schema.String),
  }),
) {}
